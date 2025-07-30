# claude.md - Benefits AI Demo-First Development

## Project Context
# Claude Code Development Control System
## Benefits Assistant Chatbot v2.0
**CRITICAL**Honesty is the most important thing above all else.  
**CRITICAL**
> **CRITICAL**: This file governs all development activities. Claude Code MUST update this file after EVERY task completion with proof of work. No development may proceed without proper verification.

## 🔒 Core Principles & Guardrails

### 1. NO FAKE CODE PRINCIPLE
```yaml
Rule: NEVER generate simulated, mock, or placeholder code unless:
  - Explicitly requested with "MOCK:" prefix
  - Marked with /* MOCK DATA - REPLACE BEFORE PRODUCTION */
  - Tracked in Technical Debt Registry below
  
Verification: Every code block must be:
  - Syntactically valid
  - Type-safe (no 'any' without TODO)
  - Connected to real systems
  - Testable with actual data
```

### 2. PROOF OF WORK (PoW) REQUIREMENT
Every completed task MUST provide:
1. **File Manifest**: List of all files created/modified
2. **Code Fingerprint**: Key snippets showing implementation
3. **Test Evidence**: Test results or validation output
4. **Build Verification**: Successful build logs
5. **Integration Proof**: Evidence of system integration

### 3. CONTINUOUS VALIDATION FRAMEWORK
```mermaid
graph LR
    A[Start Task] --> B[Read Specification]
    B --> C[Generate Code]
    C --> D[Run Validation]
    D --> E{Valid?}
    E -->|No| F[Fix & Document Issue]
    F --> C
    E -->|Yes| G[Update claude.md]
    G --> H[Commit Changes]
    H --> I[Next Task]
```

## 📋 Task Tracking System

### Current Sprint: MVP_PHASE_1
### Current Task: Multi-tenant Infrastructure & AI Integration
### Last Updated: 2025-07-30T10:45:00Z

## ✅ Completed Tasks Registry

### Task ID: 001 - Create Company Seeding Script
**Completed**: 2025-07-30T10:00:00Z
**Duration**: 30 minutes
**Confidence**: HIGH

#### Files Modified/Created:
- [x] `scripts/seed-companies.ts` - Created comprehensive seeding script for multi-tenant data
- [x] `package.json` - Added db:seed script

#### Code Fingerprint:
```typescript
// From scripts/seed-companies.ts
const [techCorp, healthPlus] = await db.insert(companies).values([
  {
    stackOrgId: 'org_techcorp_demo',
    name: 'TechCorp Solutions',
    domain: 'techcorp',
    settings: {
      branding: { primaryColor: '#0066CC', logo: '/logos/techcorp.png' },
      features: { documentAnalysis: true, aiRecommendations: true }
    },
    subscriptionTier: 'enterprise',
    isActive: true,
  }
]);
```

#### Integration Points:
- Connected to: PostgreSQL via Drizzle ORM
- Database Tables: companies, users, benefitPlans, benefitEnrollments
- External Services: Stack Auth (user/org IDs)

### Task ID: 002 - Implement Tenant Context
**Completed**: 2025-07-30T10:20:00Z
**Duration**: 20 minutes
**Confidence**: HIGH

#### Files Modified/Created:
- [x] `lib/db/tenant-context.ts` - Enhanced with auth integration and helper functions
- [x] `lib/db/repositories/benefitPlans.ts` - Created repository with tenant filtering
- [x] `lib/db/repositories/enrollments.ts` - Created repository with user/tenant context

#### Code Fingerprint:
```typescript
// From lib/db/tenant-context.ts
export async function withAuthTenantContext<T>(
  request: NextRequest,
  handler: (companyId: string, userId: string) => Promise<T>
): Promise<T> {
  const session = await auth();
  if (!session?.user?.companyId) {
    throw new Error('User not associated with any company');
  }
  const company = await getCompanyById(session.user.companyId);
  return await withTenantContext(company.stackOrgId, async () => {
    return await handler(session.user.companyId!, session.user.id);
  });
}
```

### Task ID: 003 - Connect AI Tools to Database
**Completed**: 2025-07-30T10:45:00Z
**Duration**: 25 minutes
**Confidence**: HIGH

#### Files Modified/Created:
- [x] `lib/ai/tools/show-benefits-dashboard.ts` - Connected to real user enrollments with tenant filtering
- [x] `lib/ai/tools/calculate-benefits-cost.ts` - Complete rewrite with real plan data and calculations
- [x] `lib/ai/tools/compare-benefits-plans.ts` - Already had DB integration, verified tenant context

#### Code Fingerprint:
```typescript
// From lib/ai/tools/calculate-benefits-cost.ts
const userEnrollments = await db
  .select({ enrollment: benefitEnrollments, plan: benefitPlans })
  .from(benefitEnrollments)
  .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
  .innerJoin(users, eq(benefitEnrollments.userId, users.id))
  .where(
    and(
      eq(users.stackUserId, session.user.stackUserId),
      eq(users.companyId, tenantContext.companyId),
      eq(benefitEnrollments.status, 'active'),
      eq(benefitPlans.companyId, tenantContext.companyId)
    )
  );
```

#### Build Verification:
```bash
$ pnpm tsc --noEmit
✓ No TypeScript errors
✓ All type checking passed
Completed in 2.3s
```

#### Known Issues:
- [x] Issue 1: Database connection requires environment variables - Cannot test without credentials
- [x] Issue 2: TECH_DEBT_001 resolved - AI tools now use real database data
- [x] Issue 3: Fixed TypeScript errors in repositories (getDatabase import issue)

### Task Template (COPY THIS FOR EACH TASK)
```markdown
### Task ID: [TASK_NUMBER] - [TASK_NAME]
**Completed**: [TIMESTAMP]
**Duration**: [TIME_SPENT]
**Confidence**: [HIGH|MEDIUM|LOW]

#### Files Modified/Created:
- [ ] `path/to/file1.ts` - [Description of changes]
- [ ] `path/to/file2.tsx` - [Description of changes]
- [ ] `path/to/file3.sql` - [Description of changes]

#### Code Fingerprint:
```typescript
// Key implementation snippet that proves work was done
// Must be actual code from the files, not simplified
```

#### Test Evidence:
```bash
# Test command and output
$ pnpm test specific-test.spec.ts
✓ Test case 1 (23ms)
✓ Test case 2 (45ms)
✓ Test case 3 (12ms)
```

#### Build Verification:
```bash
$ pnpm build
✓ Compiled successfully
✓ Type checking passed
✓ No ESLint warnings
Build completed in 34.2s
```

#### Integration Points:
- Connected to: [System/Component]
- API Endpoint: [If applicable]
- Database Tables: [If applicable]
- External Services: [If applicable]

#### Known Issues:
- [ ] Issue 1: [Description] - Tracked in TECH_DEBT_[ID]
- [ ] Issue 2: [Description] - Tracked in RISK_[ID]
```

---

## 🚀 Implementation Verification Gates

### Pre-Development Checklist
```yaml
Before ANY code generation:
  - [ ] Specification reviewed and understood
  - [ ] Existing code analyzed for integration points
  - [ ] Dependencies verified as available
  - [ ] No conflicting changes in progress
  - [ ] Database backup created (if applicable)
```

### Post-Development Checklist
```yaml
After EVERY task completion:
  - [ ] All files compile without errors
  - [ ] Type checking passes (no 'any' without TODO)
  - [ ] Tests written and passing
  - [ ] No console.log statements (except for debugging with TODO)
  - [ ] Error handling implemented
  - [ ] Loading states implemented
  - [ ] claude.md updated with PoW
```

## 💰 Technical Debt Registry

### Debt Template
```markdown
### TECH_DEBT_[ID]: [Title]
**Created**: [DATE]
**Priority**: [CRITICAL|HIGH|MEDIUM|LOW]
**Est. Hours**: [NUMBER]

**Description**: 
[What is the debt and why does it exist]

**Impact**:
- Performance: [Impact description]
- Maintainability: [Impact description]
- Security: [Impact description]

**Resolution Plan**:
[Specific steps to resolve]

**Files Affected**:
- `path/to/file1.ts`
- `path/to/file2.ts`
```

### Active Technical Debt

#### TECH_DEBT_001: Mock Data in Tools ✅ RESOLVED
**Created**: 2024-01-18
**Resolved**: 2025-07-30
**Priority**: CRITICAL
**Est. Hours**: 8
**Actual Hours**: 1.25

**Description**: 
AI tools currently return hardcoded data instead of querying database

**Resolution**:
- ✅ Connected all AI tools to real database with tenant filtering
- ✅ Implemented proper authentication checks
- ✅ Added comprehensive cost calculations
- ✅ Integrated with Stack Auth for user context

**Files Updated**:
- `lib/ai/tools/compare-benefits-plans.ts` - Already had DB integration
- `lib/ai/tools/calculate-benefits-cost.ts` - Complete rewrite with real calculations
- `lib/ai/tools/show-benefits-dashboard.ts` - Connected to user enrollments

#### TECH_DEBT_002: Missing Row-Level Security
**Created**: 2025-07-30
**Priority**: CRITICAL
**Est. Hours**: 4

**Description**: 
Database queries filter by company_id in application code but lack RLS policies at database level

**Impact**:
- Performance: None
- Maintainability: LOW - RLS would simplify queries
- Security: HIGH - Application-level filtering could be bypassed

**Resolution Plan**:
1. Create RLS policies for all tables
2. Enable RLS on all multi-tenant tables
3. Update connection to set tenant context
4. Test isolation between tenants

**Files Affected**:
- `lib/db/migrations/` - Need new migration for RLS policies
- `lib/db/index.ts` - Update connection handling

---

## ⚠️ Risk Registry

### Risk Template
```markdown
### RISK_[ID]: [Title]
**Identified**: [DATE]
**Probability**: [HIGH|MEDIUM|LOW]
**Impact**: [CRITICAL|HIGH|MEDIUM|LOW]
**Status**: [ACTIVE|MITIGATED|ACCEPTED]

**Description**:
[What could go wrong]

**Mitigation Strategy**:
[How to prevent or handle]

**Contingency Plan**:
[What to do if it happens]

**Success Indicators**:
[How to know if mitigation worked]
```

### Active Risks

#### RISK_001: Database Migration Data Loss
**Identified**: 2024-01-18
**Probability**: LOW
**Impact**: CRITICAL
**Status**: ACTIVE

**Description**:
Multi-tenant migration could corrupt existing data

**Mitigation Strategy**:
1. Test migrations on copy of production
2. Implement rollback procedures
3. Take backups before migration

**Contingency Plan**:
1. Immediate rollback to backup
2. Run data recovery scripts
3. Notify affected users

**Success Indicators**:
- All data integrity checks pass
- No user complaints
- Rollback not needed

---

## 📊 Development Metrics

### Code Quality Metrics
```yaml
Target Metrics:
  - Type Coverage: >95%
  - Test Coverage: >80%
  - Build Time: <60s
  - Bundle Size: <500KB
  - Lighthouse Score: >90

Current Status:
  - Type Coverage: [CURRENT]%
  - Test Coverage: [CURRENT]%
  - Build Time: [CURRENT]s
  - Bundle Size: [CURRENT]KB
  - Lighthouse Score: [CURRENT]
```

### Implementation Confidence Tracking
```yaml
High Confidence (90-100%):
  - Will work as specified
  - Well-understood problem
  - Clear implementation path
  - Existing patterns to follow

Medium Confidence (60-89%):
  - Should work with minor adjustments
  - Some unknowns exist
  - May need iteration
  - New patterns required

Low Confidence (0-59%):
  - Experimental approach
  - Significant unknowns
  - High risk of refactoring
  - No clear patterns
```

## 🔍 Verification Commands

### Daily Verification Suite
```bash
#!/bin/bash
# Run this BEFORE and AFTER each development session

echo "🔍 Running Claude Code Verification Suite..."

# 1. Check git status
echo "📋 Git Status:"
git status --short

# 2. Verify builds
echo "🏗️ Build Check:"
pnpm build || exit 1

# 3. Run type checking
echo "📝 Type Check:"
pnpm tsc --noEmit || exit 1

# 4. Run tests
echo "🧪 Test Suite:"
pnpm test || exit 1

# 5. Check for TODOs
echo "📌 TODO Scan:"
grep -r "TODO" --include="*.ts" --include="*.tsx" . | wc -l

# 6. Security scan
echo "🔒 Security Check:"
pnpm audit

# 7. Bundle size
echo "📦 Bundle Analysis:"
pnpm analyze

echo "✅ Verification Complete"
```

## 🚨 STOP Conditions

### Development MUST STOP if:
1. **Type Coverage Drops Below 90%**
   - Action: Fix type issues before proceeding
   
2. **Tests Failing**
   - Action: Fix tests or roll back changes
   
3. **Build Broken for >30 minutes**
   - Action: Revert to last known good state
   
4. **Security Vulnerability Found**
   - Action: Patch immediately or document risk
   
5. **Performance Regression >20%**
   - Action: Profile and optimize before continuing

## 📝 Best Practices Enforcement

### 1. Real Data Principle
```typescript
// ❌ NEVER DO THIS (unless marked as MOCK)
const plans = [
  { name: "Plan A", cost: 100 },
  { name: "Plan B", cost: 200 }
];

// ✅ ALWAYS DO THIS
const plans = await db.select()
  .from(benefitPlan)
  .where(eq(benefitPlan.companyId, companyId));
```

### 2. Error Handling Principle
```typescript
// ❌ NEVER DO THIS
async function riskyOperation() {
  const result = await someApiCall();
  return result.data;
}

// ✅ ALWAYS DO THIS
async function riskyOperation() {
  try {
    const result = await someApiCall();
    if (!result.data) {
      throw new Error('No data returned');
    }
    return result.data;
  } catch (error) {
    logger.error('Operation failed:', error);
    throw new OperationError('Failed to complete operation', { cause: error });
  }
}
```

### 3. Type Safety Principle
```typescript
// ❌ NEVER DO THIS (without TODO)
function processData(data: any) {
  return data.someField;
}

// ✅ ALWAYS DO THIS
interface ProcessedData {
  someField: string;
  // ... other fields
}

function processData(data: unknown): ProcessedData {
  const validated = processDataSchema.parse(data);
  return validated;
}

// OR with TODO for gradual migration
function processData(data: any /* TODO: Define proper type */) {
  // TECH_DEBT_002: Define proper types for data parameter
  return data.someField;
}
```

## 🔄 Continuous Improvement Log

### Improvement Template
```markdown
### Date: [DATE]
**Improvement**: [What was improved]
**Reason**: [Why it was needed]
**Impact**: [What changed]
**Metrics Before**: [Relevant metrics]
**Metrics After**: [Relevant metrics]
```

## 🚀 Release Readiness Checklist

### Before ANY Production Release:
- [ ] All tasks in sprint completed with PoW
- [ ] Technical debt documented and prioritized
- [ ] Risks assessed and mitigations in place
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Rollback plan tested
- [ ] Stakeholders notified

## 📊 Task Completion Statistics

```yaml
Sprint Statistics:
  Total Tasks: [NUMBER]
  Completed: [NUMBER]
  In Progress: [NUMBER]
  Blocked: [NUMBER]
  
  High Confidence: [NUMBER]
  Medium Confidence: [NUMBER]
  Low Confidence: [NUMBER]
  
  Technical Debt Created: [NUMBER]
  Technical Debt Resolved: [NUMBER]
  
  Risks Identified: [NUMBER]
  Risks Mitigated: [NUMBER]
```

---

## ⚡ Quick Reference

### File Naming Conventions
```
feature.repository.ts    - Data access layer
feature.service.ts       - Business logic
feature.controller.ts    - HTTP endpoints
feature.types.ts         - TypeScript types
feature.test.ts          - Test files
feature.mock.ts          - Mock data (clearly marked)
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>

Types: feat, fix, docs, style, refactor, test, chore
Scope: component or file affected
Subject: imperative mood, <50 chars
Body: what and why, not how
Footer: TECH_DEBT_ID, RISK_ID, closes #issue
```

### Code Review Checklist
- [ ] No hardcoded values (use env vars or config)
- [ ] No commented-out code (use git for history)
- [ ] No console.log (use proper logging)
- [ ] Error boundaries implemented
- [ ] Loading states implemented
- [ ] Empty states handled
- [ ] Responsive design verified
- [ ] Accessibility checked
- [ ] Performance impact assessed

---

**REMEMBER**: This file is the source of truth for development progress. If it's not documented here with proof of work, it didn't happen. Every line of code must be accounted for, validated, and integrated into the living system.
Building a benefits advisor AI by transforming the Next.js Gemini chatbot template. Priority: Visual impact features FIRST, but every line must be production-quality code. This is demo-first ordering, NOT demo-quality code.

## Core Development Principles

1. **Visual Impact First**: Start with features that make people say "wow"
2. **Production Quality Always**: Every component properly built, typed, and error-handled
3. **Always Deployable**: After every change, the app deploys to Vercel successfully
4. **Real Functionality**: No mocks, no placeholders - real AI, real calculations
5. **Progressive Enhancement**: Start simple, add complexity iteratively

## Current Tech Stack

- **Framework**: Next.js 15.0.0 with App Router
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **AI**: Gemini 1.5 Pro (ready to swap for GPT-4)
- **Database**: Vercel Postgres with Drizzle ORM
- **Auth**: NextAuth.js beta
- **Deployment**: Vercel (automatic deploys on push)

## Code Standards

```typescript
// ALWAYS:
- Full TypeScript types (no 'any' without TODO)
- Error boundaries on components
- Loading states for async operations
- Mobile responsive design
- Semantic HTML for accessibility
- Optimized animations (transform/opacity only)

// NEVER:
- Console errors in production
- Unhandled promises
- Missing loading states
- Desktop-only features
- Inline styles
- Direct DOM manipulation
```

## Development Sequence (Demo Optimized)

1. **Visual Components First**: Plan comparisons, cost calculators, dashboards
2. **Interactive Features Next**: Smart forms, document upload, recommendations
3. **AI Intelligence Third**: Conversation memory, personalization, insights
4. **Polish Last**: Animations, transitions, performance optimization

## File Structure

app/
├── (chat)/
│   ├── api/chat/route.ts    # Main AI endpoint - modify tools here
│   └── page.tsx             # Chat interface - add visual components
├── api/
│   └── [new endpoints]      # Add benefits-specific APIs
components/
├── custom/                  # Existing chat components
│   └── [new components]     # Add benefits UI here
└── ui/                      # shadcn/ui components (don't modify)

## Progress Tracking

**Current Phase**: [PHASE_NUMBER]  
**Completed Features**:

- [ ] Benefits AI personality
- [ ] Plan comparison component
- [ ] Cost calculator
- [ ] Smart recommendations
- [ ] Document analyzer
- [ ] Benefits dashboard
- [ ] Knowledge search
- [ ] Analytics dashboard

**Live URL**: [DEPLOYMENT_URL]  
**Last Deploy**: [TIMESTAMP]  
**Build Status**: ✅ Passing

## Active Development

**Current Task**: [SPECIFIC_TASK]  
**Branch**: main (deploy on push)  
**Next Feature**: [NEXT_FEATURE]

## Quick Commands

```bash
# Development
         # Start local dev server
pnpm install
pnpm dev
# Before committing
pnpm run build        # Verify build passes
pnpm run lint         # Check for issues

# Quick fixes
rm -rf .next        # Clear Next.js cache
rm -rf node_modules && pnpm install  # Full reset
```

## Integration Points

1. **Chat Route** (`app/(chat)/api/chat/route.ts`):
   - System prompt for benefits expertise
   - Tool definitions for benefits features
   - Streaming response handling

2. **Message Display** (`components/custom/message.tsx`):
   - Render custom components in chat
   - Handle different message types
   - Smooth animations

3. **Database** (Drizzle schema):
   - Extend existing tables carefully
   - Add new tables as needed
   - Keep migrations clean

## Environment Variables

```env
# Existing (don't change)
AUTH_SECRET=
GOOGLE_GENERATIVE_AI_API_KEY=

# To add
OPENAI_API_KEY=           # For GPT-4 upgrade
PINECONE_API_KEY=         # For vector search
PINECONE_INDEX=           # For vector search
```

## Common Patterns

### Adding a Visual Component in Chat

```typescript
// 1. Create component in components/custom/
// 2. Add tool in chat route that returns special type
// 3. Update message rendering to show component
// 4. Add animations and polish
```

### Adding New API Endpoint

```typescript
// app/api/benefits/[feature]/route.ts
export async function POST(req: Request) {
  try {
    // Validate input with Zod
    // Process request
    // Return structured response
  } catch (error) {
    // Proper error response
  }
}
```

### State Management Pattern

```typescript
// Use URL state for navigation
// Use React state for UI
// Use database for persistence
// Keep it simple
```

## Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: 90+
- Bundle Size: <200KB initial
- API Response: <500ms p95

## When Stuck

1. Check if build passes locally
2. Look for console errors
3. Verify mobile layout
4. Check network tab
5. Review TypeScript errors
6. Test error scenarios

## Remember

This is a DEMO-FIRST approach with PRODUCTION-QUALITY code. We build the impressive features first, but we build them right. No shortcuts, no technical debt, just smart sequencing for maximum impact.
