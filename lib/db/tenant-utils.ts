import { sql } from 'drizzle-orm';
import { db } from './index';

/**
 * Database utilities for multi-tenant security
 */

/**
 * Set tenant context for the current database session
 * This must be called before any queries to ensure RLS works properly
 */
export async function setTenantContext(
  stackUserId: string,
  companyId?: string,
) {
  try {
    if (companyId) {
      // Set both user and company context
      await db.execute(
        sql`SELECT set_tenant_context(${stackUserId}::text, ${companyId}::uuid)`,
      );
    } else {
      // Set user context and derive company from user record
      await db.execute(sql`SELECT set_tenant_context(${stackUserId}::text)`);
    }
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    throw new Error('Failed to establish secure database session');
  }
}

/**
 * Get current tenant context from database session
 */
export async function getTenantContext() {
  try {
    const [result] = await db.execute(
      sql`SELECT * FROM get_current_tenant_context()`,
    );
    return {
      userId: result?.user_id as string,
      companyId: result?.company_id as string,
    };
  } catch (error) {
    console.error('Failed to get tenant context:', error);
    return null;
  }
}

/**
 * Clear tenant context (useful for platform admin operations)
 */
export async function clearTenantContext() {
  try {
    await db.execute(sql`RESET app.current_user_id`);
    await db.execute(sql`RESET app.current_company_id`);
  } catch (error) {
    console.error('Failed to clear tenant context:', error);
  }
}

/**
 * Execute a query with tenant context
 * Automatically sets and clears context around the query
 */
export async function withTenantContext<T>(
  stackUserId: string,
  operation: () => Promise<T>,
  companyId?: string,
): Promise<T> {
  await setTenantContext(stackUserId, companyId);
  try {
    return await operation();
  } finally {
    // Note: Context is automatically cleared at end of transaction
    // but we can explicitly clear it if needed
  }
}

/**
 * Execute a query with platform admin context (bypass RLS)
 * Use with extreme caution - only for platform admin operations
 */
export async function withPlatformAdminContext<T>(
  operation: () => Promise<T>,
): Promise<T> {
  // Platform admins bypass RLS through policy conditions
  // Set a platform admin user context
  await db.execute(
    sql`SELECT set_config('app.current_user_id', 'platform_admin', true)`,
  );
  try {
    return await operation();
  } finally {
    await clearTenantContext();
  }
}

/**
 * Validate that RLS is properly configured
 * This should be run after implementing RLS
 */
export async function validateRLSConfiguration() {
  console.log('🔍 Validating RLS configuration...');

  const tables = [
    'companies',
    'users',
    'chats',
    'messages',
    'knowledge_base_documents',
    'benefit_plans',
    'benefit_enrollments',
    'analytics_events',
  ];

  const results: { table: string; rlsEnabled: boolean; policies: number }[] =
    [];

  for (const table of tables) {
    try {
      // Check if RLS is enabled
      const [rlsCheck] = await db.execute(sql`
        SELECT relname, relrowsecurity 
        FROM pg_class 
        WHERE relname = ${table}
      `);

      // Count policies
      const [policyCount] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_policies 
        WHERE tablename = ${table}
      `);

      results.push({
        table,
        rlsEnabled: rlsCheck?.relrowsecurity as boolean,
        policies: (policyCount?.count as number) || 0,
      });
    } catch (error) {
      console.error(`Error checking RLS for table ${table}:`, error);
      results.push({
        table,
        rlsEnabled: false,
        policies: 0,
      });
    }
  }

  console.log('RLS Configuration Status:');
  console.table(results);

  const allTablesSecured = results.every(
    (r) => r.rlsEnabled && r.policies >= 2,
  );

  if (allTablesSecured) {
    console.log('✅ All tables properly secured with RLS');
  } else {
    console.log('❌ Some tables are not properly secured');
    const unsecured = results.filter((r) => !r.rlsEnabled || r.policies < 2);
    console.log(
      'Unsecured tables:',
      unsecured.map((r) => r.table),
    );
  }

  return { results, allTablesSecured };
}
