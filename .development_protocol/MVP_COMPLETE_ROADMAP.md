# MVP Complete Roadmap - Benefits AI Platform

## Executive Summary
This document provides a complete roadmap for achieving MVP readiness for the Benefits AI Platform, a white-label SaaS solution that enables benefits providers to offer AI-powered benefits assistance to their client companies.

**Current Status**: 35% Complete  
**Target MVP Date**: End of Week 2  
**Critical Path**: Multi-tenant infrastructure → AI Tool Integration → Admin Interfaces

---

## 1. User Roles & Capabilities

### 1.1 Employee (End User)
**Primary Goal**: Get benefits guidance and make informed decisions

**Current Capabilities**:
- ✅ Chat with AI assistant
- ✅ View benefits comparison UI
- ✅ See cost calculations
- ❌ Access personal benefits dashboard
- ❌ Upload documents for analysis
- ❌ View enrollment history
- ❌ Access company-specific knowledge base

**Required Capabilities for MVP**:
1. **Personal Benefits Dashboard**
   - Current enrollments with costs
   - Upcoming deadlines
   - Coverage summaries
   - Action items

2. **Document Analysis**
   - Upload EOBs, medical bills
   - Get explanations and guidance
   - Identify potential issues

3. **Smart Recommendations**
   - Based on usage patterns
   - Life event triggers
   - Cost optimization suggestions

### 1.2 Company Admin (HR/Benefits Administrator)
**Primary Goal**: Manage benefits and support employees

**Current Capabilities**:
- ❌ No admin interface exists
- ❌ Cannot manage benefits plans
- ❌ Cannot view employee analytics
- ❌ Cannot customize AI responses

**Required Capabilities for MVP**:
1. **Benefits Management**
   - CRUD operations on benefit plans
   - Set enrollment periods
   - Define eligibility rules
   - Upload plan documents

2. **Employee Management**
   - View roster with enrollment status
   - Bulk operations (import/export)
   - Role assignments
   - Department organization

3. **Knowledge Base Management**
   - Create/edit FAQs
   - Upload policy documents
   - Customize AI responses
   - Manage categories

4. **Analytics Dashboard**
   - Usage metrics
   - Popular questions
   - Cost trends
   - Employee satisfaction

### 1.3 Platform Super Admin (Benefits Provider)
**Primary Goal**: Manage multiple client companies and platform health

**Current Capabilities**:
- ❌ No super admin interface
- ❌ Cannot manage client companies
- ❌ Cannot monitor platform usage
- ❌ Cannot customize per-client

**Required Capabilities for MVP**:
1. **Client Management**
   - Onboard new companies
   - Manage subscriptions
   - Set usage limits
   - Configure features

2. **Platform Analytics**
   - Cross-client metrics
   - Revenue tracking
   - System health
   - AI performance

3. **Customization Tools**
   - White-label settings per client
   - Custom domains
   - Branding configuration
   - Feature toggles

4. **Support Tools**
   - Impersonate users
   - Debug conversations
   - Audit logs
   - Issue tracking

---

## 2. Technical Architecture Adjustments

### 2.1 Current Architecture Issues
1. **Single-Tenant Design**: Database schema assumes one company
2. **Hard-Coded Data**: AI tools return mock data
3. **Missing Tenant Isolation**: No row-level security
4. **No Admin Routes**: Only chat interface exists
5. **Limited Authentication**: Basic Stack Auth without roles

### 2.2 Required Architecture Changes

#### Multi-Tenant Infrastructure
```typescript
// Required: Tenant context middleware
export async function withTenantContext(
  request: Request,
  handler: (tenantId: string) => Promise<Response>
) {
  const { orgId } = await auth();
  if (!orgId) throw new Error('No tenant context');
  
  // Set RLS context
  await db.execute(sql`SET LOCAL app.tenant_id = ${orgId}`);
  
  return handler(orgId);
}

// Required: Row-level security policies
CREATE POLICY tenant_isolation ON ALL TABLES
  FOR ALL
  USING (company_id = current_setting('app.tenant_id')::uuid);
```

#### Route Structure
```
app/
├── (employee)/          # Current chat interface
│   ├── chat/
│   └── benefits/
├── (admin)/            # Company admin portal
│   ├── dashboard/
│   ├── benefits/
│   ├── employees/
│   └── knowledge/
└── (platform)/         # Super admin portal
    ├── clients/
    ├── analytics/
    └── settings/
```

---

## 3. Technical Debt Inventory

### 3.1 Critical Technical Debt

#### DEBT_001: Mock Data in AI Tools ⚠️ CRITICAL
**Location**: `lib/ai/tools/*`
**Impact**: High - All AI responses use hardcoded data
**Resolution**:
```typescript
// Current (BAD)
export const showBenefitsDashboard = tool({
  execute: async () => {
    return {
      currentPlan: "Premium Health Plus", // HARDCODED
      monthlyCost: 450,                  // HARDCODED
    };
  }
});

// Required (GOOD)
export const showBenefitsDashboard = tool({
  execute: async ({ userId }) => {
    const enrollments = await db
      .select()
      .from(benefitEnrollments)
      .where(eq(benefitEnrollments.userId, userId));
    
    return {
      currentPlan: enrollments[0]?.plan.name,
      monthlyCost: enrollments[0]?.monthlyCost,
    };
  }
});
```

#### DEBT_002: Missing Tenant Isolation ⚠️ CRITICAL
**Location**: All database queries
**Impact**: High - Security risk, data leakage
**Resolution**: Implement RLS and tenant context

#### DEBT_003: No Error Boundaries ⚠️ HIGH
**Location**: All components
**Impact**: Medium - Poor user experience on errors
**Resolution**: Add error boundaries to all routes

#### DEBT_004: Untyped AI Responses ⚠️ MEDIUM
**Location**: `types/ai-sdk-patch.d.ts`
**Impact**: Medium - Runtime errors possible
**Resolution**: Create proper types for all AI tools

### 3.2 Performance Debt

1. **No Query Optimization**
   - Missing indexes on foreign keys
   - No query result caching
   - Unoptimized JOIN operations

2. **Bundle Size**
   - No code splitting for admin routes
   - Large AI SDK bundle loaded everywhere
   - Unused dependencies

3. **Missing Caching**
   - No Redis integration
   - Database queries not cached
   - AI responses not cached

---

## 4. Implementation Plan - Week by Week

### Week 1: Foundation (Current Week)
**Goal**: Multi-tenant infrastructure and data layer

#### Day 1-2: Database & Tenant Context
- [ ] Create tenant context middleware
- [ ] Implement RLS policies
- [ ] Add company_id to all tables
- [ ] Create migration scripts

```typescript
// Required: lib/db/migrations/001_add_multi_tenant.sql
ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE benefit_plans ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE chats ADD COLUMN company_id UUID REFERENCES companies(id);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_plans_company ON benefit_plans(company_id);
```

#### Day 3-4: Connect AI Tools to Database
- [ ] Update showBenefitsDashboard tool
- [ ] Update comparePlans tool
- [ ] Update calculateBenefitsCost tool
- [ ] Add proper error handling

#### Day 5: Testing & Documentation
- [ ] Integration tests for multi-tenant
- [ ] Update API documentation
- [ ] Performance benchmarks

### Week 2: Admin Interfaces & Features
**Goal**: Complete admin portals and core features

#### Day 1-2: Company Admin Portal
- [ ] Create admin layout and navigation
- [ ] Build benefits CRUD interface
- [ ] Implement employee roster
- [ ] Add bulk import/export

#### Day 3-4: Platform Admin Portal
- [ ] Create super admin layout
- [ ] Build client management
- [ ] Implement analytics dashboards
- [ ] Add monitoring tools

#### Day 5: Polish & Deploy
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment

---

## 5. Detailed Task Breakdown

### 5.1 Database Tasks

```sql
-- 1. Add tenant fields
ALTER TABLE companies ADD COLUMN (
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  subscription_expires_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}'
);

-- 2. Create audit tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add analytics tables
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  metric_type VARCHAR(50),
  value INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 API Endpoints Required

#### Company Admin APIs
```typescript
// Benefits Management
POST   /api/admin/benefits
GET    /api/admin/benefits
PUT    /api/admin/benefits/:id
DELETE /api/admin/benefits/:id

// Employee Management
GET    /api/admin/employees
POST   /api/admin/employees/import
GET    /api/admin/employees/export

// Knowledge Base
POST   /api/admin/knowledge
GET    /api/admin/knowledge
PUT    /api/admin/knowledge/:id
DELETE /api/admin/knowledge/:id

// Analytics
GET    /api/admin/analytics/usage
GET    /api/admin/analytics/costs
GET    /api/admin/analytics/satisfaction
```

#### Platform Admin APIs
```typescript
// Client Management
POST   /api/platform/clients
GET    /api/platform/clients
PUT    /api/platform/clients/:id
DELETE /api/platform/clients/:id

// Platform Analytics
GET    /api/platform/analytics/revenue
GET    /api/platform/analytics/usage
GET    /api/platform/analytics/health

// Support Tools
POST   /api/platform/impersonate
GET    /api/platform/audit-logs
GET    /api/platform/debug/:chatId
```

### 5.3 UI Components Required

#### Shared Components
```typescript
// components/admin/
├── DataTable.tsx        // Reusable data grid
├── MetricCard.tsx       // Analytics display
├── FormBuilder.tsx      // Dynamic forms
├── FileUploader.tsx     // Document uploads
└── RoleGuard.tsx        // Access control
```

#### Admin Dashboards
```typescript
// app/(admin)/dashboard/
├── page.tsx             // Overview metrics
├── benefits/
│   ├── page.tsx        // Benefits list
│   └── [id]/edit.tsx   // Edit form
├── employees/
│   ├── page.tsx        // Employee roster
│   └── import.tsx      // Bulk import
└── knowledge/
    ├── page.tsx        // Knowledge base
    └── [id]/edit.tsx   // Edit articles
```

---

## 6. Security & Compliance

### 6.1 Required Security Measures
1. **Row-Level Security**: Enforce at database level
2. **API Rate Limiting**: Prevent abuse
3. **Audit Logging**: Track all admin actions
4. **Data Encryption**: Encrypt PII at rest
5. **CORS Policy**: Restrict origins
6. **Input Validation**: Sanitize all inputs

### 6.2 Compliance Requirements
1. **HIPAA**: If handling health data
2. **SOC 2**: For enterprise clients
3. **GDPR**: For EU employees
4. **CCPA**: For California employees

---

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
// Required test coverage
- [ ] AI tool database connections (100%)
- [ ] Tenant isolation middleware (100%)
- [ ] Authentication flows (100%)
- [ ] API endpoints (80%)
- [ ] UI components (70%)
```

### 7.2 Integration Tests
```typescript
// Critical user flows
- [ ] Employee enrollment flow
- [ ] Admin plan management
- [ ] Document upload and analysis
- [ ] Multi-tenant data isolation
- [ ] Analytics data accuracy
```

### 7.3 E2E Tests
```typescript
// Playwright tests
- [ ] Complete employee journey
- [ ] Admin portal workflows
- [ ] Platform admin operations
- [ ] Cross-tenant isolation
```

---

## 8. Performance Requirements

### 8.1 Target Metrics
- **Page Load**: < 2 seconds
- **API Response**: < 500ms p95
- **AI Response**: < 3 seconds
- **Search Results**: < 1 second
- **File Upload**: < 5 seconds for 10MB

### 8.2 Optimization Tasks
- [ ] Implement query caching
- [ ] Add CDN for static assets
- [ ] Optimize bundle splitting
- [ ] Implement lazy loading
- [ ] Add service workers

---

## 9. Deployment & DevOps

### 9.1 Infrastructure Requirements
```yaml
# Production Setup
- Database: Neon Postgres (Pro tier)
- Hosting: Vercel (Enterprise)
- CDN: Cloudflare
- Monitoring: Datadog
- Error Tracking: Sentry
- Analytics: PostHog
```

### 9.2 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
- Run tests
- Type checking
- Lint code
- Build application
- Run migrations
- Deploy to staging
- Run E2E tests
- Deploy to production
```

---

## 10. Success Criteria

### 10.1 MVP Feature Completeness
- [x] Basic chat interface (DONE)
- [x] AI integration (DONE)
- [ ] Multi-tenant support (IN PROGRESS)
- [ ] Employee dashboard
- [ ] Admin portal
- [ ] Platform portal
- [ ] Document analysis
- [ ] Knowledge base
- [ ] Analytics

### 10.2 Quality Metrics
- [ ] 80% test coverage
- [ ] 0 critical security issues
- [ ] < 2s page load time
- [ ] 99.9% uptime
- [ ] NPS score > 7

### 10.3 Business Metrics
- [ ] Support 10+ client companies
- [ ] Handle 1000+ employees
- [ ] Process 10k+ conversations/month
- [ ] < 5% error rate
- [ ] < 24hr onboarding time

---

## 11. Risk Mitigation

### 11.1 Technical Risks
1. **AI Hallucinations**: Implement guardrails and validation
2. **Data Breaches**: Enforce strict isolation and encryption
3. **Performance Issues**: Add caching and monitoring
4. **Vendor Lock-in**: Abstract AI providers

### 11.2 Business Risks
1. **Slow Adoption**: Build onboarding wizard
2. **Complex Setup**: Provide templates and defaults
3. **Support Burden**: Create self-service tools
4. **Compliance Issues**: Hire compliance consultant

---

## 12. Next Immediate Actions

### Today (Priority 1)
1. Create tenant context middleware
2. Add company_id to all tables
3. Update AI tools to use real data
4. Fix TypeScript errors in repositories

### Tomorrow (Priority 2)
1. Build admin route structure
2. Create benefits CRUD API
3. Implement RLS policies
4. Add integration tests

### This Week (Priority 3)
1. Complete admin dashboard UI
2. Add analytics collection
3. Implement file uploads
4. Deploy to staging

---

## Conclusion

The Benefits AI Platform requires significant work to reach MVP status. The critical path involves:

1. **Immediate**: Fix multi-tenant infrastructure
2. **This Week**: Connect AI to real data
3. **Next Week**: Build admin interfaces
4. **Testing**: Ensure security and performance

With focused execution on these priorities, the platform can achieve MVP readiness within 2 weeks, enabling the benefits provider to onboard their first client companies and begin delivering value.

The most critical technical debt to resolve is the hardcoded data in AI tools and the lack of tenant isolation. These must be addressed before any production deployment to ensure security and functionality.