migrating a benefits management platform from PostgreSQL/Stack Auth to Firebase/Google Cloud.
Current state:
- Next.js 15 app with working UI components
- Multi-tenant architecture needs adaptation for single company
- Chat interface exists but needs Vertex AI integration
- Document processing needs migration to Document AI

Key directories:
- /app - Next.js routes and pages
- /lib - Business logic and services
- /components - React components (preserve these)

Firebase services to integrate:
- Authentication (replacing Stack Auth)
- Firestore (replacing PostgreSQL)
- Cloud Storage (replacing Vercel Blob)
- Cloud Functions (new processing pipeline)
- Vertex AI (replacing mixed AI providers)
Gemini-Specific Development Patterns
Pattern 1: Firebase Service Integration
When integrating [SERVICE_NAME]:
1. Show me the current implementation in [FILE_PATH]
2. Generate Firebase equivalent preserving the interface
3. Create migration script from old to new
4. Update environment variables
5. Test with Firebase emulator first
Pattern 2: Firestore Schema Design
For [FEATURE_NAME] data model:
1. Analyze current PostgreSQL schema
2. Design Firestore collections with subcollections
3. Create TypeScript interfaces with strict typing
4. Generate repository pattern with converters
5. Include real-time listeners where applicable
Pattern 3: Cloud Function Creation
Create Cloud Function for [TRIGGER_TYPE]:
1. Define trigger (HTTP/Firestore/Storage/Schedule)
2. Implement with proper error handling
3. Add retry logic and idempotency
4. Include structured logging
5. Create local test file
Gemini Troubleshooting Protocol
When Gemini Gets Stuck

Reset Context: "Let's start fresh. Here's the current problem: [SPECIFIC_ISSUE]"
Provide Working Example: "Here's a similar working implementation: [CODE]"
Break Down Task: "Let's focus only on [SINGLE_ASPECT] first"
Request Alternative: "Show me a different approach to [PROBLEM]"

Avoiding Loops

Never repeat the same prompt more than twice
If stuck, ask: "What specific information do you need to solve this?"
Provide counter-examples when Gemini makes wrong assumptions
Use concrete file paths and line numbers

Firebase-Specific Prompts
Authentication Migration
Migrate authentication from Stack Auth to Firebase Auth:
Current file: /app/(auth)/stack-auth.ts
Requirements:
- Preserve all existing routes
- Maintain role-based access (platform_admin, company_admin, hr_admin, employee)
- Use custom claims for company association
- Keep existing UI components
Show step-by-step migration preserving the auth() function interface.
Firestore Repository Pattern
Create Firestore repository for [ENTITY]:
Current PostgreSQL query: [PASTE_QUERY]
Firestore path: /companies/{companyId}/[ENTITY]
Include:
- Type-safe converters
- Pagination support
- Real-time updates option
- Compound query support
- Error handling with fallbacks
Vertex AI Integration
Integrate Vertex AI for chat responses:
Current implementation: /app/api/chat/route.ts
Requirements:
- Streaming responses with SSE
- Conversation history management
- Function calling for tools
- Token counting and limits
- Error recovery with fallback
Generate complete implementation with same response format.

claude.md - Development Progress Tracker
Project Status Gates
Gate 0: Project Audit ❌ NOT STARTED
Objective: Complete technical debt analysis and fix critical issues
Checklist:

 Security audit completed
 Dependencies updated
 TypeScript errors resolved
 Environment variables documented
 Database migrations prepared
 Test infrastructure validated

Evidence Required:
typescript// Run audit command
npm run audit:full
// Output: Zero critical vulnerabilities
// TypeScript: Zero errors
// Test coverage: Baseline established
Gate 1: Firebase Infrastructure ❌ NOT STARTED
Objective: Complete Firebase project setup
Checklist:

 Firebase project created
 Service account configured
 Environment variables set
 Security rules deployed
 Emulators running locally

Evidence Required:
bashfirebase emulators:start
# All services running on local ports
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
# Storage: http://localhost:9199
Gate 2: Authentication Migration ❌ NOT STARTED
Objective: Replace Stack Auth with Firebase Auth
Checklist:

 Firebase Auth configured
 Custom claims implemented
 Middleware updated
 Session management working
 All routes protected

Evidence Required:
typescript// Test authentication flow
const user = await signIn(email, password);
console.log(user.customClaims); // { role: 'employee', companyId: 'xxx' }
// All protected routes return 401 when unauthenticated
Gate 3: Database Migration ❌ NOT STARTED
Objective: Migrate from PostgreSQL to Firestore
Checklist:

 Schema designed and documented
 Migration scripts complete
 Repositories implemented
 Real-time listeners working
 Data integrity verified

Evidence Required:
typescript// Test data operations
const company = await companyRepo.get(companyId);
const plans = await benefitRepo.list(companyId);
// Real-time updates working
onSnapshot(query, (snapshot) => console.log('Updated:', snapshot.size));
Gate 4: Document Processing ❌ NOT STARTED
Objective: Implement Document AI pipeline
Checklist:

 Cloud Storage integrated
 Upload flow working
 Document AI processing
 Embeddings generated
 Search index updated

Evidence Required:
typescript// Test document pipeline
const docId = await uploadDocument(file);
// Wait for processing
const doc = await getDocument(docId);
console.log(doc.status); // 'processed'
console.log(doc.extractedText); // Full text content
Gate 5: AI Chat System ❌ NOT STARTED
Objective: Vertex AI chat with RAG
Checklist:

 Vertex AI client configured
 Streaming responses working
 RAG context injection
 Function calling implemented
 Error handling complete

Evidence Required:
typescript// Test chat with RAG
const response = await chat('What are my benefits?');
// Response includes citations from documents
console.log(response.sources); // ['doc1.pdf', 'doc2.pdf']
Gate 6: Production Deployment ❌ NOT STARTED
Objective: Deploy to Cloud Run
Checklist:

 Docker image built
 Cloud Run deployed
 Custom domain configured
 Monitoring enabled
 Load testing passed

Evidence Required:
bash# Production health check
curl https://benefits.company.com/api/health
# Response: { status: 'healthy', version: '1.0.0' }
# Load test: 100 concurrent users, <200ms response time
Feature Implementation Tracker
Small Feature Template
markdown### Feature: [FEATURE_NAME]
**Status**: ❌ NOT STARTED | 🟡 IN PROGRESS | ✅ COMPLETE
**Files Modified**: 
- [ ] file1.ts
- [ ] file2.tsx

**Implementation Steps**:
1. [ ] Step 1 with specific action
2. [ ] Step 2 with verification

**Test Evidence**:
```typescript
// Paste test execution results
