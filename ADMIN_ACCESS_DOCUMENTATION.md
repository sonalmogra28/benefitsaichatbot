# Admin & Super Admin Portal Access Documentation

**Last Updated:** 2025-08-07  
**Security Level:** 🔒 CONFIDENTIAL

## Overview

This document provides comprehensive information on accessing and using the admin and super admin portals in the Benefits Chatbot application.

## User Roles & Access Levels

### 1. Employee (Basic User)
- **Access:** `/chat`, `/benefits/*`
- **Permissions:** View benefits, enroll in plans, use AI chat
- **Portal:** Main application only

### 2. HR Admin
- **Access:** `/company-admin/*`
- **Permissions:** Manage employees, upload documents, view company analytics
- **Portal:** Company Admin Portal

### 3. Company Admin
- **Access:** `/company-admin/*`
- **Permissions:** All HR Admin permissions + billing, company settings
- **Portal:** Company Admin Portal (enhanced features)

### 4. Platform Admin (Super Admin)
- **Access:** `/super-admin/*`, `/admin/*`, all other portals
- **Permissions:** Full system access, manage all companies and users
- **Portal:** Super Admin Portal

## Accessing Admin Portals

### Company Admin Portal

**URL:** `https://your-domain.com/company-admin`

**Login Requirements:**
- Valid Stack Auth account
- User role: `hr_admin` or `company_admin`
- Associated with a company

**Features Available:**
1. **Dashboard** (`/company-admin`)
   - Company overview
   - Quick stats
   - Recent activities

2. **Benefits Management** (`/company-admin/benefits`)
   - Create/edit benefit plans
   - View enrollment statistics
   - Manage plan details

3. **Employee Management** (`/company-admin/employees`)
   - View all employees
   - Add/edit employee information
   - Assign roles
   - Bulk operations

4. **Documents** (`/company-admin/documents`)
   - Upload benefits documents
   - Manage knowledge base
   - Document processing status

5. **Analytics** (Company Admin only)
   - Usage statistics
   - Cost analysis
   - Employee engagement metrics

### Super Admin Portal

**URL:** `https://your-domain.com/super-admin`

**Login Requirements:**
- Valid Stack Auth account
- User role: `platform_admin`
- Explicitly granted super admin access

**Features Available:**
1. **Dashboard** (`/super-admin`)
   - Platform-wide statistics
   - System health monitoring
   - Recent admin activities

2. **Company Management** (`/super-admin/companies`)
   - View all companies
   - Create new companies
   - Edit company settings
   - Subscription management

3. **User Management** (`/super-admin/users`)
   - View all users across platform
   - Assign roles (including platform_admin)
   - User activity monitoring
   - Account management

4. **Analytics** (`/super-admin/analytics`)
   - Platform-wide usage
   - Revenue metrics
   - System performance
   - Custom reports

5. **System Settings** (`/super-admin/settings`)
   - Platform configuration
   - Feature flags
   - Integration settings
   - Security settings

## Setting Up Admin Access

### Creating a Company Admin

1. **Via Super Admin Portal:**
```bash
# Navigate to /super-admin/users
# Find the user
# Click "Edit" and change role to "company_admin"
```

2. **Via Script:**
```bash
pnpm create-admin --email user@company.com --role company_admin --company-id <uuid>
```

3. **Via Database:**
```sql
UPDATE users 
SET role = 'company_admin' 
WHERE email = 'user@company.com' 
AND company_id = 'company-uuid';
```

### Creating a Platform Admin (Super Admin)

⚠️ **CRITICAL SECURITY:** Only grant platform admin access to trusted personnel.

1. **Via Script (Recommended):**
```bash
# This script includes security checks and audit logging
pnpm create-platform-admin --email admin@company.com
```

2. **Via Super Admin Portal:**
```bash
# Navigate to /super-admin/users/assign-role
# Enter user email
# Select "platform_admin" role
# Confirm with 2FA (if enabled)
```

3. **Manual Database Update (Emergency Only):**
```sql
-- First verify the user exists and is legitimate
SELECT id, email, company_id FROM users WHERE email = 'admin@company.com';

-- Update role with audit trail
UPDATE users 
SET 
  role = 'platform_admin',
  updated_at = NOW()
WHERE email = 'admin@company.com';

-- Log the action
INSERT INTO audit_logs (user_id, action, resource, details)
VALUES (
  'admin-user-id',
  'admin:role_change',
  'user',
  '{"new_role": "platform_admin", "reason": "Manual promotion"}'
);
```

## Security Considerations

### Authentication Flow
1. User logs in via Stack Auth
2. System checks user role in database
3. Middleware validates access to admin routes
4. Tenant context is set for data isolation
5. All actions are logged for audit

### Access Control Implementation
```typescript
// Middleware protection (automatic)
/company-admin/* - Requires: ['hr_admin', 'company_admin', 'platform_admin']
/super-admin/* - Requires: ['platform_admin']
/admin/* - Requires: ['platform_admin']

// API protection
withCompanyAdmin() - For company admin endpoints
withPlatformAdmin() - For super admin endpoints
```

### Session Security
- Sessions expire after 24 hours
- Admin actions require fresh authentication
- Suspicious activity triggers security alerts
- All admin access is logged

## Common Admin Tasks

### 1. Add a New Employee
```typescript
// Company Admin Portal
Navigate to: /company-admin/employees
Click: "Add Employee"
Fill: Email, Name, Role
Submit: Creates Stack Auth account and sends invitation
```

### 2. Create a Benefit Plan
```typescript
// Company Admin Portal
Navigate to: /company-admin/benefits
Click: "Create Plan"
Fill: Plan details, costs, coverage
Submit: Plan becomes available for enrollment
```

### 3. View Platform Analytics
```typescript
// Super Admin Portal
Navigate to: /super-admin/analytics
Select: Date range and metrics
Export: Download CSV or PDF reports
```

### 4. Manage User Roles
```typescript
// Super Admin Portal
Navigate to: /super-admin/users
Search: Find user by email
Edit: Change role and permissions
Save: Updates take effect immediately
```

## Troubleshooting

### Cannot Access Admin Portal

1. **Check User Role:**
```bash
pnpm list-users --email your@email.com
```

2. **Verify Company Assignment:**
```sql
SELECT u.*, c.name as company_name 
FROM users u 
LEFT JOIN companies c ON u.company_id = c.id 
WHERE u.email = 'your@email.com';
```

3. **Check Session:**
- Clear cookies
- Log out and log back in
- Check browser console for errors

### Missing Features

1. **For Company Admins:**
- Verify role is `company_admin` not `hr_admin`
- Check company subscription tier

2. **For Platform Admins:**
- Ensure role is exactly `platform_admin`
- Check feature flags in environment

### Performance Issues

1. **Slow Loading:**
- Check database indices
- Review recent audit logs for heavy queries
- Monitor API response times

2. **Timeout Errors:**
- Increase session timeout
- Check rate limiting settings
- Review middleware performance

## API Endpoints

### Company Admin Endpoints
```
GET    /api/company-admin/employees
POST   /api/company-admin/employees
PUT    /api/company-admin/employees/[id]
DELETE /api/company-admin/employees/[id]

GET    /api/admin/documents
POST   /api/admin/companies/[companyId]/documents/upload

GET    /api/admin/analytics/chat
```

### Super Admin Endpoints
```
GET    /api/super-admin/users
POST   /api/super-admin/users
PUT    /api/super-admin/users/[id]

GET    /api/super-admin/companies
POST   /api/super-admin/companies
PUT    /api/super-admin/companies/[id]

GET    /api/super-admin/analytics
POST   /api/super-admin/export

GET    /api/super-admin/settings
PUT    /api/super-admin/settings
```

## Monitoring & Alerts

### Admin Activity Monitoring
- All admin actions are logged in `audit_logs` table
- Suspicious patterns trigger alerts
- Weekly admin activity reports

### Key Metrics to Monitor
1. Failed admin login attempts
2. Bulk data operations
3. Role changes
4. Data exports
5. Setting modifications

### Alert Thresholds
- 5+ failed login attempts: Security alert
- 100+ records modified: Audit review
- Role elevation: Immediate notification
- Data export > 1000 records: Manager approval

## Best Practices

1. **Principle of Least Privilege**
   - Grant minimum required permissions
   - Regular access reviews
   - Remove unused admin accounts

2. **Audit Trail**
   - Document reason for admin actions
   - Regular audit log reviews
   - Maintain change history

3. **Security**
   - Use strong passwords
   - Enable 2FA (when available)
   - Regular security training
   - Report suspicious activity

4. **Data Protection**
   - Limit data exports
   - Mask sensitive information
   - Encrypted connections only
   - No local data storage

## Emergency Procedures

### Revoking Admin Access
```bash
# Immediate revocation
pnpm revoke-admin --email user@company.com --immediate

# Graceful revocation
UPDATE users SET role = 'employee' WHERE email = 'user@company.com';
```

### Locking Down System
```bash
# Disable all admin access
pnpm lockdown --level admin

# Disable specific company
pnpm lockdown --company-id <uuid>
```

### Audit Emergency
```bash
# Export all admin actions
pnpm export-audit --days 30 --role platform_admin

# Find suspicious activity
pnpm analyze-audit --pattern suspicious
```

## Contact & Support

### Technical Issues
- Check system status page
- Review error logs
- Contact: tech-support@company.com

### Security Concerns
- Immediate: security@company.com
- Non-urgent: Use security ticket system
- Emergency: Call security hotline

### Access Requests
- Company Admin: Contact your IT department
- Platform Admin: Requires C-level approval
- Submit via: access-request@company.com

---

**Remember:** With great power comes great responsibility. Admin access should be used judiciously and all actions are permanently logged.