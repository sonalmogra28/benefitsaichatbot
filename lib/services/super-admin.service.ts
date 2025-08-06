import { db } from '@/lib/db';
import {
  companies,
  users,
  knowledgeBaseDocuments,
  chats,
  messages,
} from '@/lib/db/schema';
import {
  eq,
  sql,
  desc,
  and,
  gte,
  count,
  sum,
} from 'drizzle-orm';
import { emailService } from '@/lib/services/email.service';
import type {
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanyWithStats,
  UserWithCompany,
  BulkUserCreateInput,
  SystemAnalytics,
  AuditLog,
  DataExportRequest,
  SystemSettings,
  AuditAction,
} from '@/lib/types/super-admin';

export class SuperAdminService {
  // Company Management
  async createCompany(
    input: Omit<CompanyCreateInput, 'features'> & { features: string[] },
  ): Promise<CompanyWithStats> {
    const [company] = await db
      .insert(companies)
      .values({
        name: input.name,
        domain: input.domain,
        stackOrgId: `temp-org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID until Stack Auth creates real one
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create admin user for the company
    if (input.adminEmail) {
      await db.insert(users).values({
        stackUserId: `temp-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID until Stack Auth creates real one
        email: input.adminEmail,
        firstName: input.adminEmail.split('@')[0],
        lastName: '',
        role: 'company_admin',
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await this.logAudit('company.created', 'company', company.id, {
      name: input.name,
      domain: input.domain,
      billingPlan: input.billingPlan,
    });

    return this.getCompanyWithStats(company.id);
  }

  async updateCompany(
    id: string,
    input: Omit<CompanyUpdateInput, 'features'> & { features?: string[] },
  ): Promise<CompanyWithStats> {
    const [updated] = await db
      .update(companies)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    await this.logAudit('company.updated', 'company', id, input);

    return this.getCompanyWithStats(id);
  }

  async deleteCompany(id: string): Promise<void> {
    // Soft delete - mark as inactive
    await db
      .update(companies)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id));

    await this.logAudit('company.deleted', 'company', id, {});
  }

  async getCompanyWithStats(id: string): Promise<CompanyWithStats> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1);

    const stats = await this.getCompanyStats(id);

    return {
      ...company,
      ...stats,
    };
  }

  async listCompanies(
    page = 1,
    limit = 20,
    includeDeleted = false,
  ): Promise<{ companies: CompanyWithStats[]; total: number }> {
    const offset = (page - 1) * limit;

    const whereClause = includeDeleted
      ? undefined
      : eq(companies.isActive, true);

    const companiesList = await db
      .select()
      .from(companies)
      .where(whereClause)
      .orderBy(desc(companies.createdAt))
      .limit(limit)
      .offset(offset);

    const companiesWithStats = await Promise.all(
      companiesList.map(async (company) => {
        const stats = await this.getCompanyStats(company.id);
        return { ...company, ...stats };
      }),
    );

    const totalQuery = whereClause
      ? await db.select({ total: count() }).from(companies).where(whereClause)
      : await db.select({ total: count() }).from(companies);
    const [{ total }] = totalQuery;

    return { companies: companiesWithStats, total };
  }

  private async getCompanyStats(companyId: string) {
    const [userStats] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.companyId, companyId));

    const [docStats] = await db
      .select({ count: count() })
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.companyId, companyId));

    const [chatStats] = await db
      .select({ count: count() })
      .from(chats)
      .innerJoin(users, eq(chats.userId, users.id))
      .where(eq(users.companyId, companyId));

    // Calculate storage (simplified - would need actual file sizes)
    const storageUsed = docStats.count * 1024 * 1024; // Assume 1MB per doc

    // Get last activity
    const [lastActivity] = await db
      .select({ lastActive: sql`MAX(${messages.createdAt})` })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .innerJoin(users, eq(chats.userId, users.id))
      .where(eq(users.companyId, companyId));

    // Monthly active users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [mauStats] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(chats, eq(users.id, chats.userId))
      .where(
        and(
          eq(users.companyId, companyId),
          gte(chats.createdAt, thirtyDaysAgo),
        ),
      );

    return {
      userCount: userStats.count,
      documentCount: docStats.count,
      chatCount: chatStats.count,
      lastActivity: lastActivity?.lastActive
        ? new Date(lastActivity.lastActive as any)
        : undefined,
      storageUsed,
      monthlyActiveUsers: mauStats.count,
    };
  }

  // User Management
  async createBulkUsers(
    input: BulkUserCreateInput,
  ): Promise<(typeof users.$inferSelect)[]> {
    // Get company details for email invitations
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, input.companyId))
      .limit(1);

    if (!company) {
      throw new Error('Company not found');
    }

    const newUsers = await db
      .insert(users)
      .values(
        input.users.map((user) => ({
          stackUserId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID until Stack Auth creates real one
          email: user.email,
          firstName: user.name.split(' ')[0] || '',
          lastName: user.name.split(' ').slice(1).join(' ') || '',
          role: user.type,
          companyId: input.companyId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      )
      .returning();

    await this.logAudit('user.created', 'user', '', {
      count: newUsers.length,
      companyId: input.companyId,
    });

    // Send invitation emails if requested
    if (input.sendInvites) {
      const emailPromises = newUsers.map(async (user) => {
        // Generate invite link (this would typically include a secure token)
        const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/setup?token=${user.id}&email=${encodeURIComponent(user.email)}`;

        const result = await emailService.sendUserInvite({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          companyName: company.name,
          inviteLink,
          role: user.role,
        });

        if (!result.success) {
          console.error(
            `Failed to send invite email to ${user.email}:`,
            result.error,
          );
          // Log the failure but don't fail the entire operation
          await this.logAudit('email.failed', 'user', user.id, {
            email: user.email,
            error: result.error,
          });
        } else {
          await this.logAudit('email.sent', 'user', user.id, {
            email: user.email,
            type: 'invitation',
          });
        }

        return result;
      });

      // Wait for all emails to be sent
      await Promise.all(emailPromises);
    }

    return newUsers;
  }

  async listAllUsers(
    page = 1,
    limit = 50,
    companyId?: string,
  ): Promise<{ users: UserWithCompany[]; total: number }> {
    const offset = (page - 1) * limit;

    const whereClause = companyId ? eq(users.companyId, companyId) : undefined;

    const usersList = await db
      .select({
        user: users,
        company: companies,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const usersWithStats = await Promise.all(
      usersList.map(async (row) => {
        const [chatCount] = await db
          .select({ count: count() })
          .from(chats)
          .where(eq(chats.userId, row.user.id));

        return {
          ...row.user,
          company: row.company ?? undefined,
          chatCount: chatCount.count,
          documentCount: 0, // TODO: Implement document ownership
        } as UserWithCompany;
      }),
    );

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    return { users: usersWithStats, total };
  }

  async updateUserRole(userId: string, newType: string): Promise<void> {
    const [oldUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await db
      .update(users)
      .set({ role: newType, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.logAudit('user.role_changed', 'user', userId, {
      oldRole: oldUser.role,
      newRole: newType,
    });
  }

  async suspendUser(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.logAudit('user.suspended', 'user', userId, {});
  }

  // System Analytics
  async getSystemAnalytics(): Promise<SystemAnalytics> {
    // Company metrics
    const [companyStats] = await db
      .select({
        total: count(),
        active: sum(
          sql`CASE WHEN ${companies.isActive} = true THEN 1 ELSE 0 END`,
        ),
      })
      .from(companies);

    // User metrics
    const [userStats] = await db.select({ total: count() }).from(users);

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active users
    const [dailyActive] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(chats, eq(users.id, chats.userId))
      .where(gte(chats.createdAt, dayAgo));

    const [weeklyActive] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(chats, eq(users.id, chats.userId))
      .where(gte(chats.createdAt, weekAgo));

    const [monthlyActive] = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(chats, eq(users.id, chats.userId))
      .where(gte(chats.createdAt, monthAgo));

    // Usage metrics
    const [usageStats] = await db
      .select({
        totalChats: count(chats.id),
        totalMessages: count(messages.id),
        totalDocuments: count(knowledgeBaseDocuments.id),
      })
      .from(chats)
      .leftJoin(messages, eq(chats.id, messages.chatId))
      .leftJoin(knowledgeBaseDocuments, sql`true`);

    // Storage by company
    const storageByCompany = await db
      .select({
        companyId: companies.id,
        name: companies.name,
        docCount: count(knowledgeBaseDocuments.id),
      })
      .from(companies)
      .leftJoin(
        knowledgeBaseDocuments,
        eq(companies.id, knowledgeBaseDocuments.companyId),
      )
      .groupBy(companies.id, companies.name)
      .orderBy(desc(count(knowledgeBaseDocuments.id)))
      .limit(10);

    return {
      totalCompanies: Number(companyStats.total),
      activeCompanies: Number(companyStats.active || 0),
      totalUsers: userStats.total,
      activeUsers: {
        daily: dailyActive.count,
        weekly: weeklyActive.count,
        monthly: monthlyActive.count,
      },
      storage: {
        total: 100 * 1024 * 1024 * 1024, // 100GB total
        used: storageByCompany.reduce(
          (acc, c) => acc + c.docCount * 1024 * 1024,
          0,
        ),
        byCompany: storageByCompany.map((c) => ({
          companyId: c.companyId,
          name: c.name,
          used: c.docCount * 1024 * 1024, // Assume 1MB per doc
        })),
      },
      usage: {
        totalChats: usageStats.totalChats,
        totalMessages: usageStats.totalMessages,
        totalDocuments: usageStats.totalDocuments,
        averageChatsPerUser:
          userStats.total > 0
            ? Math.round((usageStats.totalChats / userStats.total) * 10) / 10
            : 0,
        peakHours: [], // TODO: Implement hourly usage tracking
      },
      revenue: {
        mrr: 0, // TODO: Implement billing integration
        arr: 0,
        byPlan: [],
        churnRate: 0,
      },
    };
  }

  // Audit Logging
  private async logAudit(
    action: AuditAction,
    resourceType: AuditLog['resourceType'],
    resourceId: string,
    details: Record<string, any>,
  ): Promise<void> {
    // TODO: Get current user from context
    const userId = 'system';
    const userEmail = 'system@platform';

    // In production, this would write to a dedicated audit log table
    console.log('[AUDIT]', {
      timestamp: new Date(),
      userId,
      userEmail,
      action,
      resourceType,
      resourceId,
      details,
    });
  }

  // Data Export
  async exportData(request: DataExportRequest): Promise<any> {
    const exports: Record<string, any[]> = {};

    if (request.includeTypes.includes('companies')) {
      const { companies } = await this.listCompanies(1, 10000, true);
      exports.companies = companies;
    }

    if (request.includeTypes.includes('users')) {
      const { users } = await this.listAllUsers(1, 10000, request.companyId);
      exports.users = users;
    }

    if (request.includeTypes.includes('documents')) {
      const docs = await db
        .select()
        .from(knowledgeBaseDocuments)
        .where(
          request.companyId
            ? eq(knowledgeBaseDocuments.companyId, request.companyId)
            : undefined,
        );
      exports.documents = docs;
    }

    // TODO: Add date range filtering
    // TODO: Add format conversion (CSV, Excel)

    await this.logAudit('data.exported', 'system', '', {
      types: request.includeTypes,
      companyId: request.companyId,
      format: request.format,
    });

    return exports;
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSettings> {
    // In production, this would be stored in a database
    return {
      maintenanceMode: false,
      signupsEnabled: true,
      defaultBillingPlan: 'starter',
      maxCompaniesPerDomain: 5,
      emailSettings: {
        provider: 'sendgrid',
        fromEmail: 'noreply@platform.com',
        fromName: 'Benefits Platform',
      },
      storageSettings: {
        provider: 's3',
        maxFileSizeMB: 50,
        allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt'],
      },
      aiSettings: {
        provider: 'openai',
        model: 'gpt-4',
        maxTokensPerRequest: 4000,
        rateLimitPerMinute: 60,
      },
      featureFlags: {
        newOnboarding: true,
        advancedAnalytics: false,
        apiAccess: true,
      },
    };
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
    await this.logAudit('settings.updated', 'system', '', settings);
    // TODO: Implement actual settings storage
  }
}
