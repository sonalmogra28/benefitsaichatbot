import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema-v2';

/**
 * Tenant Context Management
 * 
 * This module provides utilities for managing multi-tenant database operations
 * with proper isolation and context injection.
 */

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    const connectionString = process.env.POSTGRES_URL_NO_SSL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Database connection string not found');
    }
    
    const client = postgres(connectionString);
    dbInstance = drizzle(client, { schema });
  }
  
  return dbInstance;
}

/**
 * Execute a database operation with tenant context
 * 
 * This function sets the current organization ID in the database session
 * and executes the provided operation within that context.
 */
export async function withTenantContext<T>(
  stackOrgId: string,
  operation: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  
  try {
    // Set the current organization ID for RLS policies
    await db.execute(sql`SET LOCAL app.current_org_id = ${stackOrgId}`);
    
    // Execute the operation within this context
    return await operation(db);
    
  } catch (error) {
    console.error('Error in tenant context operation:', error);
    throw error;
  }
}

/**
 * Get the current tenant context from Stack Auth session
 * 
 * This function extracts the organization ID from the current user session
 * and provides it for database operations.
 */
export function getCurrentTenantContext(): {
  stackOrgId: string | null;
  stackUserId: string | null;
} {
  // This will be implemented when we integrate Stack Auth
  // For now, return null values
  return {
    stackOrgId: null,
    stackUserId: null,
  };
}

/**
 * Validate tenant access for a given resource
 * 
 * This function ensures that the current user has access to the specified
 * company/organization resources.
 */
export async function validateTenantAccess(
  stackOrgId: string,
  resourceCompanyId: string
): Promise<boolean> {
  const db = getDatabase();
  
  try {
    const [company] = await db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(sql`${schema.companies.stackOrgId} = ${stackOrgId} AND ${schema.companies.id} = ${resourceCompanyId}`)
      .limit(1);
    
    return !!company;
  } catch (error) {
    console.error('Error validating tenant access:', error);
    return false;
  }
}

/**
 * Get company by Stack organization ID
 */
export async function getCompanyByStackOrgId(stackOrgId: string) {
  const db = getDatabase();
  
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(sql`${schema.companies.stackOrgId} = ${stackOrgId}`)
    .limit(1);
  
  return company || null;
}

/**
 * Get user by Stack user ID with company context
 */
export async function getUserByStackUserId(stackUserId: string) {
  const db = getDatabase();
  
  const result = await db
    .select()
    .from(schema.users)
    .leftJoin(schema.companies, sql`${schema.users.companyId} = ${schema.companies.id}`)
    .where(sql`${schema.users.stackUserId} = ${stackUserId}`)
    .limit(1);
  
  const [row] = result;
  if (!row) return null;
  
  return {
    ...row.users,
    company: row.companies
  };
}
