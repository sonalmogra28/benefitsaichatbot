import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { auth } from '@/app/(auth)/stack-auth';
import * as schema from './schema';
import type { NextRequest } from 'next/server';

/**
 * Tenant Context Management
 * 
 * This module provides utilities for managing multi-tenant database operations
 * with proper isolation and context injection.
 */

/**
 * Execute a database operation with tenant context
 * 
 * This function sets the current organization ID in the database session
 * and executes the provided operation within that context.
 */
export async function withTenantContext<T>(
  stackOrgId: string,
  operation: (database: typeof db) => Promise<T>
): Promise<T> {
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
 * Middleware to ensure tenant context is set for all requests
 * Wraps a handler function with tenant context from auth
 */
export async function withAuthTenantContext<T>(
  request: NextRequest,
  handler: (companyId: string, userId: string) => Promise<T>
): Promise<T> {
  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  
  if (!session.user.companyId) {
    throw new Error('User not associated with any company');
  }
  
  // Store user reference for TypeScript - we know companyId exists after the check above
  const user = session.user;
  const companyId = session.user.companyId;
  
  // Get the company's stack org ID
  const company = await getCompanyById(companyId);
  if (!company) {
    throw new Error('Company not found');
  }
  
  // Execute with tenant context
  return await withTenantContext(company.stackOrgId, async () => {
    return await handler(companyId, user.id);
  });
}

/**
 * Get the current tenant context from Stack Auth session
 * 
 * This function extracts the organization ID from the current user session
 * and provides it for database operations.
 */
export async function getCurrentTenantContext(): Promise<{
  stackOrgId: string | null;
  stackUserId: string | null;
  companyId: string | null;
}> {
  const session = await auth();
  
  if (!session?.user || !session.user.companyId) {
    return {
      stackOrgId: null,
      stackUserId: null,
      companyId: null,
    };
  }
  
  const company = await getCompanyById(session.user.companyId);
  
  return {
    stackOrgId: company?.stackOrgId || null,
    stackUserId: session.user.stackUserId,
    companyId: session.user.companyId,
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
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(sql`${schema.companies.stackOrgId} = ${stackOrgId}`)
    .limit(1);
  
  return company || null;
}

/**
 * Get company by ID
 */
export async function getCompanyById(companyId: string) {
  const [company] = await db
    .select()
    .from(schema.companies)
    .where(sql`${schema.companies.id} = ${companyId}`)
    .limit(1);
  
  return company || null;
}

/**
 * Get user by Stack user ID with company context
 */
export async function getUserByStackUserId(stackUserId: string) {
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
