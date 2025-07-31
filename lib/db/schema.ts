import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  boolean,
  decimal,
  date,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================================================
// MULTI-TENANT CORE TABLES
// ============================================================================

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  stackOrgId: text('stack_org_id').unique().notNull(), // Stack Auth organization ID
  name: text('name').notNull(),
  domain: text('domain').unique(), // for subdomain routing (optional)
  settings: json('settings').default({}),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('basic'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  stackOrgIdIdx: index('companies_stack_org_id_idx').on(table.stackOrgId),
  domainIdx: index('companies_domain_idx').on(table.domain),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  stackUserId: text('stack_user_id').unique().notNull(), // Stack Auth user ID
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: varchar('role', { length: 50 }).notNull().default('employee'), // employee, hr_admin, company_admin
  employeeId: text('employee_id'), // company's internal employee ID
  department: text('department'),
  hireDate: date('hire_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  stackUserIdIdx: index('users_stack_user_id_idx').on(table.stackUserId),
  companyIdIdx: index('users_company_id_idx').on(table.companyId),
  emailCompanyUnique: unique('users_email_company_unique').on(table.email, table.companyId),
  employeeIdCompanyUnique: unique('users_employee_id_company_unique').on(table.employeeId, table.companyId),
}));

// ============================================================================
// BENEFITS MANAGEMENT TABLES
// ============================================================================

export const benefitPlans = pgTable('benefit_plans', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // health, dental, vision, life, disability, retirement
  category: varchar('category', { length: 50 }).notNull(), // HMO, PPO, HDHP, etc.
  provider: text('provider').notNull(),
  description: text('description'),
  monthlyPremiumEmployee: decimal('monthly_premium_employee', { precision: 10, scale: 2 }),
  monthlyPremiumFamily: decimal('monthly_premium_family', { precision: 10, scale: 2 }),
  deductibleIndividual: decimal('deductible_individual', { precision: 10, scale: 2 }),
  deductibleFamily: decimal('deductible_family', { precision: 10, scale: 2 }),
  outOfPocketMaxIndividual: decimal('out_of_pocket_max_individual', { precision: 10, scale: 2 }),
  outOfPocketMaxFamily: decimal('out_of_pocket_max_family', { precision: 10, scale: 2 }),
  copayPrimaryCare: decimal('copay_primary_care', { precision: 10, scale: 2 }),
  copaySpecialist: decimal('copay_specialist', { precision: 10, scale: 2 }),
  coinsurancePercentage: integer('coinsurance_percentage'),
  features: json('features').default([]), // array of feature strings
  coverageDetails: json('coverage_details').default({}), // detailed coverage info
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('benefit_plans_company_id_idx').on(table.companyId),
  typeIdx: index('benefit_plans_type_idx').on(table.type),
  effectiveDateIdx: index('benefit_plans_effective_date_idx').on(table.effectiveDate),
  nameCompanyEffectiveUnique: unique('benefit_plans_name_company_effective_unique').on(
    table.name, table.companyId, table.effectiveDate
  ),
}));

export const benefitEnrollments = pgTable('benefit_enrollments', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  benefitPlanId: uuid('benefit_plan_id').notNull().references(() => benefitPlans.id, { onDelete: 'cascade' }),
  coverageType: varchar('coverage_type', { length: 50 }).notNull(), // individual, family, employee_spouse, etc.
  enrollmentDate: date('enrollment_date').notNull(),
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  monthlyCost: decimal('monthly_cost', { precision: 10, scale: 2 }).notNull(),
  employerContribution: decimal('employer_contribution', { precision: 10, scale: 2 }).default('0'),
  employeeContribution: decimal('employee_contribution', { precision: 10, scale: 2 }).notNull(),
  dependents: json('dependents').default([]), // array of dependent info
  status: varchar('status', { length: 50 }).default('active'), // active, pending, cancelled
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('benefit_enrollments_user_id_idx').on(table.userId),
  benefitPlanIdIdx: index('benefit_enrollments_benefit_plan_id_idx').on(table.benefitPlanId),
  effectiveDateIdx: index('benefit_enrollments_effective_date_idx').on(table.effectiveDate),
  userPlanEffectiveUnique: unique('benefit_enrollments_user_plan_effective_unique').on(
    table.userId, table.benefitPlanId, table.effectiveDate
  ),
}));

// ============================================================================
// KNOWLEDGE BASE TABLES
// ============================================================================

export const knowledgeBaseDocuments = pgTable('knowledge_base_documents', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(), // policy, guide, faq, form
  category: varchar('category', { length: 50 }), // benefits, hr, compliance, etc.
  tags: text('tags').array().default([]),
  fileUrl: text('file_url'), // if uploaded file
  fileType: varchar('file_type', { length: 20 }), // pdf, docx, etc.
  processedAt: timestamp('processed_at', { withTimezone: true }),
  // Note: Vector embeddings will be added when we integrate vector search
  isPublic: boolean('is_public').default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('knowledge_base_documents_company_id_idx').on(table.companyId),
  documentTypeIdx: index('knowledge_base_documents_document_type_idx').on(table.documentType),
  categoryIdx: index('knowledge_base_documents_category_idx').on(table.category),
  createdByIdx: index('knowledge_base_documents_created_by_idx').on(table.createdBy),
}));

// ============================================================================
// CHAT SYSTEM (UPDATED FOR MULTI-TENANT)
// ============================================================================

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  visibility: varchar('visibility', { length: 20 }).default('private'), // private, company, public
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('chats_user_id_idx').on(table.userId),
  companyIdIdx: index('chats_company_id_idx').on(table.companyId),
  createdAtIdx: index('chats_created_at_idx').on(table.createdAt),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  parts: json('parts').notNull(), // message parts for AI SDK compatibility
  attachments: json('attachments').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  chatIdIdx: index('messages_chat_id_idx').on(table.chatId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

export const votes = pgTable('votes', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  isUpvoted: boolean('is_upvoted').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.messageId] }),
}));

// ============================================================================
// ANALYTICS TABLES
// ============================================================================

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 100 }).notNull(), // chat_message, plan_comparison, document_view, etc.
  eventData: json('event_data').default({}),
  sessionId: text('session_id'),
  ipAddress: text('ip_address'), // Using text instead of inet for simplicity
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('analytics_events_company_id_idx').on(table.companyId),
  userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
  eventTypeIdx: index('analytics_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  benefitPlans: many(benefitPlans),
  knowledgeBaseDocuments: many(knowledgeBaseDocuments),
  chats: many(chats),
  analyticsEvents: many(analyticsEvents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  benefitEnrollments: many(benefitEnrollments),
  chats: many(chats),
  knowledgeBaseDocuments: many(knowledgeBaseDocuments),
  analyticsEvents: many(analyticsEvents),
}));

export const benefitPlansRelations = relations(benefitPlans, ({ one, many }) => ({
  company: one(companies, {
    fields: [benefitPlans.companyId],
    references: [companies.id],
  }),
  enrollments: many(benefitEnrollments),
}));

export const benefitEnrollmentsRelations = relations(benefitEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [benefitEnrollments.userId],
    references: [users.id],
  }),
  benefitPlan: one(benefitPlans, {
    fields: [benefitEnrollments.benefitPlanId],
    references: [benefitPlans.id],
  }),
}));

export const knowledgeBaseDocumentsRelations = relations(knowledgeBaseDocuments, ({ one }) => ({
  company: one(companies, {
    fields: [knowledgeBaseDocuments.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [knowledgeBaseDocuments.createdBy],
    references: [users.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [chats.companyId],
    references: [companies.id],
  }),
  messages: many(messages),
  votes: many(votes),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  chat: one(chats, {
    fields: [votes.chatId],
    references: [chats.id],
  }),
  message: one(messages, {
    fields: [votes.messageId],
    references: [messages.id],
  }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  company: one(companies, {
    fields: [analyticsEvents.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Company = InferSelectModel<typeof companies>;
export type NewCompany = InferInsertModel<typeof companies>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type BenefitPlan = InferSelectModel<typeof benefitPlans>;
export type NewBenefitPlan = InferInsertModel<typeof benefitPlans>;

export type BenefitEnrollment = InferSelectModel<typeof benefitEnrollments>;
export type NewBenefitEnrollment = InferInsertModel<typeof benefitEnrollments>;

export type KnowledgeBaseDocument = InferSelectModel<typeof knowledgeBaseDocuments>;
export type NewKnowledgeBaseDocument = InferInsertModel<typeof knowledgeBaseDocuments>;

export type Chat = InferSelectModel<typeof chats>;
export type NewChat = InferInsertModel<typeof chats>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type Vote = InferSelectModel<typeof votes>;
export type NewVote = InferInsertModel<typeof votes>;

export type AnalyticsEvent = InferSelectModel<typeof analyticsEvents>;
export type NewAnalyticsEvent = InferInsertModel<typeof analyticsEvents>;

// ============================================================================
// LEGACY SCHEMA COMPATIBILITY (for migration)
// ============================================================================

// Keep existing tables for migration compatibility
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

// Legacy type exports for compatibility
export type LegacyUser = InferSelectModel<typeof user>;
export type LegacyChat = InferSelectModel<typeof chat>;
export type DBMessage = InferSelectModel<typeof message>;
export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;
export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;
