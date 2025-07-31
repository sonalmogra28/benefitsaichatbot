# Testing & Quality Assurance Strategy

## Overview

This document defines the comprehensive testing and quality assurance strategy for the Benefits AI Platform. Our goal is to achieve 80% test coverage while ensuring all critical user paths are thoroughly tested.

---

## 🎯 Testing Philosophy

### Core Principles
1. **Test Critical Paths First**: Focus on user journeys that matter most
2. **Prevent Regressions**: Automated tests for all bug fixes
3. **Test in Production**: Monitor real user experiences
4. **Fail Fast**: Catch issues during development, not in production
5. **Documentation as Tests**: Living documentation through test descriptions

---

## 📊 Current Testing Gaps

### Coverage Analysis
| Component | Current | Target | Gap | Priority |
|-----------|---------|--------|-----|----------|
| API Routes | 0% | 90% | 90% | CRITICAL |
| UI Components | 15% | 80% | 65% | HIGH |
| Database Queries | 0% | 85% | 85% | HIGH |
| AI Tools | 20% | 95% | 75% | CRITICAL |
| Auth Flows | 10% | 100% | 90% | CRITICAL |
| Utils/Helpers | 5% | 70% | 65% | MEDIUM |

---

## 🧪 Testing Strategy by Layer

### 1. Unit Tests

#### API Route Tests
```typescript
// Example: Document Upload API Test
describe('POST /api/admin/companies/[companyId]/documents/upload', () => {
  it('should reject unauthorized users', async () => {
    const response = await request(app)
      .post('/api/admin/companies/123/documents/upload')
      .expect(401);
  });

  it('should validate file types', async () => {
    const response = await request(app)
      .post('/api/admin/companies/123/documents/upload')
      .set('Authorization', 'Bearer valid-token')
      .attach('file', 'test.exe')
      .expect(400);
    
    expect(response.body.error).toContain('File type not allowed');
  });

  it('should process valid PDF uploads', async () => {
    const response = await request(app)
      .post('/api/admin/companies/123/documents/upload')
      .set('Authorization', 'Bearer admin-token')
      .attach('file', 'test-benefits.pdf')
      .field('metadata', JSON.stringify({
        title: 'Test Benefits Guide',
        documentType: 'guide'
      }))
      .expect(200);
    
    expect(response.body.document).toHaveProperty('id');
    expect(response.body.document.status).toBe('pending_processing');
  });
});
```

#### Component Tests
```typescript
// Example: Document Upload Component Test
describe('DocumentUploadSection', () => {
  it('should show company dropdown for platform admin', () => {
    const { getByText, getByRole } = render(
      <DocumentUploadSection companies={mockCompanies} />
    );
    
    expect(getByText('Select a company')).toBeInTheDocument();
    expect(getByRole('combobox')).toBeEnabled();
  });

  it('should validate file size', async () => {
    const { getByLabelText, getByText } = render(
      <DocumentUploadSection companies={mockCompanies} />
    );
    
    const file = new File(['x'.repeat(60 * 1024 * 1024)], 'large.pdf', {
      type: 'application/pdf'
    });
    
    fireEvent.change(getByLabelText('File'), { target: { files: [file] } });
    
    await waitFor(() => {
      expect(getByText(/exceeds 50MB limit/)).toBeInTheDocument();
    });
  });
});
```

#### Database Tests
```typescript
// Example: Multi-tenant Isolation Test
describe('Multi-tenant Data Isolation', () => {
  it('should not return data from other companies', async () => {
    // Create test data for two companies
    const company1 = await createTestCompany('Company 1');
    const company2 = await createTestCompany('Company 2');
    
    const doc1 = await createTestDocument(company1.id, 'Doc 1');
    const doc2 = await createTestDocument(company2.id, 'Doc 2');
    
    // Query as company 1
    const results = await withTenantContext(company1.id, async () => {
      return await db.select().from(knowledgeBaseDocuments);
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(doc1.id);
    expect(results.find(d => d.id === doc2.id)).toBeUndefined();
  });
});
```

### 2. Integration Tests

#### AI Integration Tests
```typescript
describe('RAG Integration', () => {
  beforeEach(async () => {
    // Setup test documents in Pinecone
    await setupTestVectors();
  });

  it('should retrieve relevant context for queries', async () => {
    const context = await searchKnowledge({
      query: 'What is the deductible for health insurance?',
      companyId: testCompanyId,
      limit: 5
    });
    
    expect(context.results).toHaveLength(5);
    expect(context.results[0].relevanceScore).toBeGreaterThan(0.8);
    expect(context.results[0].metadata.documentTitle).toContain('Health');
  });

  it('should include citations in AI responses', async () => {
    const response = await chatCompletion({
      messages: [{ role: 'user', content: 'What are my dental benefits?' }],
      companyId: testCompanyId,
      userId: testUserId
    });
    
    expect(response.citations).toHaveLength(greaterThan(0));
    expect(response.citations[0]).toHaveProperty('documentId');
    expect(response.citations[0]).toHaveProperty('chunkIndex');
  });
});
```

#### End-to-End API Tests
```typescript
describe('Complete Document Processing Flow', () => {
  it('should process document from upload to searchable', async () => {
    // 1. Upload document
    const uploadResponse = await uploadDocument(testFile);
    const documentId = uploadResponse.body.document.id;
    
    // 2. Wait for processing
    await waitForProcessing(documentId, { timeout: 30000 });
    
    // 3. Verify document is processed
    const doc = await getDocument(documentId);
    expect(doc.processedAt).toBeTruthy();
    
    // 4. Verify vectors are stored
    const vectorCount = await getVectorCount(testCompanyId);
    expect(vectorCount).toBeGreaterThan(0);
    
    // 5. Verify document is searchable
    const searchResults = await searchDocuments({
      query: 'test content from document',
      companyId: testCompanyId
    });
    
    expect(searchResults.find(r => r.documentId === documentId)).toBeTruthy();
  });
});
```

### 3. E2E Tests (Playwright)

#### Critical User Journeys
```typescript
// Platform Admin Journey
test('Platform admin can set up a new company', async ({ page }) => {
  // Login as platform admin
  await loginAsPlatformAdmin(page);
  
  // Navigate to companies
  await page.click('text=Companies');
  await page.click('text=Add New Company');
  
  // Fill company details
  await page.fill('[name="companyName"]', 'Test Corp');
  await page.fill('[name="domain"]', 'testcorp');
  await page.selectOption('[name="subscriptionTier"]', 'enterprise');
  
  // Upload logo
  await page.setInputFiles('[name="logo"]', 'test-logo.png');
  
  // Configure settings
  await page.click('text=Next: Settings');
  await page.check('[name="features.aiRecommendations"]');
  
  // Upload initial documents
  await page.click('text=Next: Documents');
  await page.setInputFiles('[name="documents"]', [
    'benefits-guide.pdf',
    'health-plan.pdf'
  ]);
  
  // Complete setup
  await page.click('text=Create Company');
  await expect(page.locator('text=Company created successfully')).toBeVisible();
});

// Employee Journey
test('Employee can get benefits information', async ({ page }) => {
  // Login as employee
  await loginAsEmployee(page);
  
  // Ask a question
  await page.fill('[placeholder="Ask about your benefits..."]', 
    'What is my health insurance deductible?');
  await page.press('[placeholder="Ask about your benefits..."]', 'Enter');
  
  // Verify response
  await expect(page.locator('text=deductible')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Citation')).toBeVisible();
  
  // Click citation
  await page.click('text=Citation');
  await expect(page.locator('text=Source: Health Insurance Guide')).toBeVisible();
});
```

### 4. Performance Tests

#### Load Testing Script
```javascript
// k6 load test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Error rate under 1%
  },
};

export default function() {
  // Test chat API
  const chatResponse = http.post('https://api.benefitsai.com/api/chat', 
    JSON.stringify({
      messages: [{ role: 'user', content: 'What are my benefits?' }],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(chatResponse, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has citations': (r) => JSON.parse(r.body).citations?.length > 0,
  });
  
  sleep(1);
}
```

### 5. Security Tests

#### Penetration Testing Checklist
```yaml
Authentication:
  - [ ] Test for weak passwords
  - [ ] Test session timeout
  - [ ] Test concurrent sessions
  - [ ] Test JWT token validation
  - [ ] Test role escalation

Data Access:
  - [ ] Test cross-tenant data access
  - [ ] Test SQL injection
  - [ ] Test API parameter tampering
  - [ ] Test file upload vulnerabilities
  - [ ] Test directory traversal

API Security:
  - [ ] Test rate limiting
  - [ ] Test CORS policies
  - [ ] Test input validation
  - [ ] Test error message leakage
  - [ ] Test HTTP security headers
```

---

## 📝 Testing Implementation Plan

### Phase 1: Critical Path Tests (Week 1)
1. **Auth Flow Tests** - Login, role validation, session management
2. **Multi-tenant Isolation** - Data separation verification
3. **Document Upload** - File validation, processing
4. **AI Query Tests** - Basic chat functionality
5. **Security Tests** - SQL injection, XSS, CSRF

### Phase 2: API Coverage (Week 2)
1. **All API Routes** - Success and error cases
2. **Validation Tests** - Input validation for all endpoints
3. **Permission Tests** - Role-based access control
4. **Error Handling** - Graceful failure scenarios
5. **Rate Limiting** - API abuse prevention

### Phase 3: UI Testing (Week 3)
1. **Component Tests** - All UI components
2. **User Journey E2E** - Critical paths for each role
3. **Responsive Tests** - Mobile/tablet compatibility
4. **Accessibility Tests** - WCAG compliance
5. **Browser Tests** - Cross-browser compatibility

### Phase 4: Performance & Scale (Week 4)
1. **Load Tests** - 1000+ concurrent users
2. **Stress Tests** - Breaking point identification
3. **Database Tests** - Query optimization
4. **API Tests** - Response time validation
5. **CDN Tests** - Static asset delivery

---

## 🔧 Testing Infrastructure

### Required Tools
```json
{
  "unit-testing": {
    "framework": "Jest",
    "coverage": "Jest Coverage",
    "mocking": "Jest Mocks + MSW"
  },
  "integration-testing": {
    "api": "Supertest",
    "database": "Jest + Test containers"
  },
  "e2e-testing": {
    "framework": "Playwright",
    "visual": "Percy"
  },
  "performance-testing": {
    "load": "k6",
    "monitoring": "Datadog"
  },
  "security-testing": {
    "scanning": "OWASP ZAP",
    "dependencies": "Snyk"
  }
}
```

### CI/CD Pipeline
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7
    steps:
      - run: pnpm test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm playwright install
      - run: pnpm test:e2e
      
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm audit
      - run: pnpm snyk test
```

---

## 📊 Quality Metrics

### Code Quality Standards
- **Test Coverage**: Minimum 80% overall, 95% for critical paths
- **Code Review**: All PRs require 2 approvals
- **Linting**: Zero ESLint errors/warnings
- **Type Safety**: Strict TypeScript, no `any` without TODO
- **Documentation**: All public APIs documented

### Performance Standards
- **API Response**: p95 < 2 seconds
- **Page Load**: < 3 seconds on 3G
- **Time to Interactive**: < 5 seconds
- **Bundle Size**: < 500KB initial
- **Database Queries**: < 100ms p95

### Security Standards
- **Vulnerability Scanning**: Weekly automated scans
- **Penetration Testing**: Quarterly external audits
- **Dependency Updates**: Monthly security patches
- **Code Analysis**: Static analysis on every commit
- **Access Reviews**: Quarterly permission audits

---

## ✅ Definition of Quality

A feature is considered "done" when:

1. **Functionality**: Works as specified in all scenarios
2. **Tests**: Unit, integration, and E2E tests passing
3. **Performance**: Meets performance benchmarks
4. **Security**: Passes security scan
5. **Accessibility**: WCAG 2.1 AA compliant
6. **Documentation**: API and user docs complete
7. **Code Review**: Approved by 2+ developers
8. **Monitoring**: Metrics and alerts configured

---

## 🚨 Testing Anti-Patterns to Avoid

1. **Testing Implementation Details**: Test behavior, not implementation
2. **Brittle Selectors**: Use data-testid, not CSS classes
3. **Slow Tests**: Mock external services, use test databases
4. **Flaky Tests**: Fix immediately, don't disable
5. **Missing Edge Cases**: Test error paths thoroughly
6. **Ignoring Warnings**: Treat warnings as errors
7. **Manual Only**: Automate everything possible

---

This comprehensive testing strategy ensures quality throughout the development lifecycle and provides confidence in production deployments.