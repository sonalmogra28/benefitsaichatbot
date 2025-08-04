# Phase 2 Implementation Plan - Zero Technical Debt Approach

## Overview
This document outlines the exact implementation sequence with live deployments at each checkpoint. Every phase must be deployed and tested before proceeding.

---

## Phase 0: Technical Debt Resolution & Pinecone Setup
**Duration**: 1 day
**Deploy Checkpoint**: After all debt resolved

### 0.1 Critical Debt Resolution
- [ ] Remove duplicate repository: Delete `lib/db/repositories/benefit-plans.repository.ts` (keep newer pattern)
- [ ] Remove console.log from `app/(chat)/api/chat/route.ts`
- [ ] Fix 'any' type in `lib/db/repositories/user.repository.ts`
- [ ] Standardize tenant context pattern to use `withAuthTenantContext`
- [ ] Update claude.md with resolved items

### 0.2 Pinecone Setup & Testing
```bash
# Test locally first
pnpm add @pinecone-database/pinecone
```

**Create test file**: `scripts/test-pinecone.ts`
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

async function testPinecone() {
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const index = pinecone.index('benefits-ai');
  const stats = await index.describeIndexStats();
  console.log('Pinecone connected:', stats);
}

testPinecone();
```

### 0.3 Deploy & Test
- Build locally: `pnpm build`
- Commit with proof of work in claude.md
- Push to deploy
- Verify deployment works
- **STOP** - Do not proceed until verified

---

## Phase 2.1: Document Upload Infrastructure
**Duration**: 2 days
**Deploy Checkpoint**: After upload works end-to-end

### Day 1: Backend Infrastructure
#### Morning: Storage Setup
1. **Vercel Blob Configuration**
   ```typescript
   // lib/storage/blob.ts
   import { put, del, list } from '@vercel/blob';
   
   export async function uploadDocument(file: File, companyId: string) {
     const blob = await put(`companies/${companyId}/documents/${file.name}`, file, {
       access: 'private',
     });
     return blob;
   }
   ```

2. **Database Schema Usage**
   ```typescript
   // Use existing schema from schema-v2.ts
   // knowledgeBaseDocuments table already exists
   ```

3. **Upload API Endpoint**
   ```typescript
   // app/api/admin/companies/[companyId]/documents/upload/route.ts
   ```

#### Afternoon: Processing Pipeline
1. **PDF Processing**
   ```bash
   pnpm add pdf-parse
   ```
   
2. **Text Extraction Service**
   ```typescript
   // lib/documents/processor.ts
   ```

3. **Background Job Setup**
   ```typescript
   // app/api/cron/process-documents/route.ts
   ```

### Day 2: Frontend Implementation
1. **Upload Component**
   ```typescript
   // app/admin/companies/[companyId]/documents/page.tsx
   ```

2. **Progress Tracking**
3. **Error Handling**

### Deployment Checkpoint 2.1
- [ ] Upload a PDF through the UI
- [ ] Verify it appears in Vercel Blob
- [ ] Confirm database record created
- [ ] Check processing job starts
- [ ] **Live Test**: Upload 3 different PDFs
- [ ] Update claude.md with proof
- **STOP** - Do not proceed until all verified

---

## Phase 2.2: Vector Search Integration
**Duration**: 2 days
**Deploy Checkpoint**: After RAG returns accurate results

### Day 1: Embeddings & Storage
1. **Embeddings Generation**
   ```typescript
   // lib/ai/embeddings.ts
   import { openai } from '@ai-sdk/openai';
   
   export async function generateEmbedding(text: string) {
     const response = await openai.embeddings.create({
       model: 'text-embedding-3-small',
       input: text,
     });
     return response.data[0].embedding;
   }
   ```

2. **Pinecone Integration**
   ```typescript
   // lib/vectors/pinecone.ts
   export async function upsertDocumentChunks(
     companyId: string,
     documentId: string,
     chunks: DocumentChunk[]
   ) {
     const index = pinecone.index('benefits-ai');
     const namespace = index.namespace(companyId);
     
     const vectors = await Promise.all(
       chunks.map(async (chunk) => ({
         id: `${documentId}-${chunk.index}`,
         values: await generateEmbedding(chunk.text),
         metadata: {
           documentId,
           companyId,
           text: chunk.text,
           page: chunk.page,
         }
       }))
     );
     
     await namespace.upsert(vectors);
   }
   ```

3. **Search Implementation**
   ```typescript
   // lib/ai/tools/search-knowledge.ts
   ```

### Day 2: RAG Integration
1. **Update Chat Route**
2. **Add Citation Support**
3. **Test Accuracy**

### Deployment Checkpoint 2.2
- [ ] Process a document into vectors
- [ ] Query Pinecone directly to verify vectors exist
- [ ] Ask a question about uploaded document
- [ ] Verify answer includes correct citation
- [ ] **Live Test**: 5 different questions with accuracy check
- [ ] Update claude.md with proof
- **STOP** - Do not proceed until accuracy confirmed

---

## Phase 2.3: Company Configuration
**Duration**: 3 days
**Deploy Checkpoint**: After company fully configured

### Day 1: Branding System
1. **Logo Upload**
2. **Color Configuration**
3. **Dynamic CSS Generation**

### Day 2: Employee Management
1. **CSV Import**
2. **Invitation System**
3. **Role Assignment**

### Day 3: Settings & Polish
1. **Feature Toggles**
2. **Usage Limits**
3. **Complete Testing**

### Deployment Checkpoint 2.3
- [ ] Configure complete company branding
- [ ] Import 10 employees via CSV
- [ ] Send test invitations
- [ ] Verify branded experience
- [ ] **Live Test**: Complete company setup < 30 minutes
- [ ] Update claude.md with proof
- **STOP** - Do not proceed until company fully functional

---

## Phase 2.4: Analytics Implementation
**Duration**: 2 days
**Deploy Checkpoint**: After analytics show real data

### Implementation Details
1. **Event Tracking System**
2. **Dashboard Components**
3. **Real-time Updates**

### Deployment Checkpoint 2.4
- [ ] Track 10 different events
- [ ] View analytics dashboard
- [ ] Export analytics data
- [ ] **Live Test**: One week of data collection
- [ ] Update claude.md with proof

---

## Phase 2.5: Complete Employee Experience
**Duration**: 2 days
**Deploy Checkpoint**: After employees can self-serve

### Implementation Details
1. **Employee Dashboard**
2. **Enhanced Chat UI**
3. **Benefits Overview**

### Final Deployment Checkpoint
- [ ] Employee completes full journey
- [ ] All features working together
- [ ] Performance metrics met
- [ ] **Live Test**: 5 employees for 1 week
- [ ] Update claude.md with final proof

---

## Success Criteria

Each phase must meet these criteria before proceeding:
1. **No TypeScript errors**: `pnpm tsc --noEmit`
2. **Build passes**: `pnpm build`
3. **No console errors** in production
4. **Live deployment** accessible
5. **User testing** confirms functionality
6. **claude.md updated** with proof of work

## Pinecone Testing Protocol

At each phase involving Pinecone:
1. Test connection with script
2. Verify index statistics
3. Test upsert operation
4. Test query operation
5. Monitor usage dashboard

## Rollback Plan

If any deployment fails:
1. Revert to previous commit
2. Fix issues locally
3. Test thoroughly
4. Re-deploy with fixes
5. Document lessons learned

---

**Remember**: Zero technical debt. Clean code. Test everything. Deploy often.