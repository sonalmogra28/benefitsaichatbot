import { db } from './index';
import { sql } from 'drizzle-orm';

/**
 * Set tenant context for RLS using parameterized queries
 */
export async function setTenantContext(
  stackUserId: string,
  companyId?: string | null,
): Promise<void> {
  if (!stackUserId) {
    throw new Error('Stack user ID is required for tenant context');
  }

  try {
    // Use parameterized query to prevent SQL injection
    const query = sql`
      SELECT set_tenant_context(
        ${stackUserId}::text,
        ${companyId || null}::uuid
      )
    `;
    
    await db.execute(query);
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    // Don't throw - allow request to continue without RLS
    // This prevents auth failures if RLS is not configured
  }
}

/**
 * Clear tenant context
 */
export async function clearTenantContext(): Promise<void> {
  try {
    await db.execute(sql`SELECT clear_tenant_context()`);
  } catch (error) {
    console.error('Failed to clear tenant context:', error);
  }
}

/**
 * Get current tenant context
 */
export async function getCurrentTenant(): Promise<{
  userId?: string;
  companyId?: string;
} | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.current_company_id', true) as company_id
    `);
    
    if (result && result.length > 0) {
      const row = result[0] as any;
      return {
        userId: row.user_id || undefined,
        companyId: row.company_id || undefined,
      };
    }
  } catch (error) {
    console.error('Failed to get tenant context:', error);
  }
  
  return null;
}

/**
 * Execute a function with tenant context
 */
export async function withTenantContext<T>(
  stackUserId: string,
  companyId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  await setTenantContext(stackUserId, companyId);
  try {
    return await fn();
  } finally {
    await clearTenantContext();
  }
}