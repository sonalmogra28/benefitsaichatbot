# Phase 2 Implementation Guide - Week 1 Day-by-Day Plan

## Week 1: Validation & Integration

### Day 1 (Monday): Environment Setup & Component Validation

#### Morning (4 hours)
1. **Environment Configuration**
   ```bash
   # Create .env.local with required variables
   OPENAI_API_KEY=sk-...
   PINECONE_API_KEY=...
   PINECONE_INDEX_NAME=benefits-ai
   ```

2. **Validate Existing Components**
   - Test chat UI at `/chat`
   - Verify Stack Auth integration
   - Check streaming functionality
   - Document any issues found

3. **Set Up Pinecone Index**
   ```typescript
   // Test Pinecone connection
   cd /Users/spencerpro/benefitschatbot
   npm run test:pinecone
   ```

#### Afternoon (4 hours)
1. **Test Benefits Tools**
   - Send test messages to trigger each tool:
     - "Show me my benefits dashboard"
     - "Calculate my healthcare costs"
     - "Compare health insurance plans"
   - Document tool responses

2. **Create Integration Test Suite**
   ```typescript
   // /tests/integration/chat.test.ts
   describe('Chat Integration', () => {
     test('streaming response works', async () => {
       // Test implementation
     });
   });
   ```

### Day 2 (Tuesday): Document Management UI

#### Morning (4 hours)
1. **Create Document Upload Component**
   ```typescript
   // /components/admin/document-upload.tsx
   import { useState } from 'react';
   import { Upload } from 'lucide-react';
   
   export function DocumentUpload({ companyId }: { companyId: string }) {
     // Implementation
   }
   ```

2. **Create Document List Component**
   ```typescript
   // /components/admin/document-list.tsx
   export function DocumentList({ documents }: { documents: Document[] }) {
     // Show documents with status, actions
   }
   ```

#### Afternoon (4 hours)
1. **Create Document Management Page**
   ```typescript
   // /app/(app)/admin/documents/page.tsx
   import { DocumentUpload } from '@/components/admin/document-upload';
   import { DocumentList } from '@/components/admin/document-list';
   
   export default async function DocumentsPage() {
     // Fetch and display documents
   }
   ```

2. **Test Document Upload Flow**
   - Upload test PDF
   - Verify file appears in blob storage
   - Check database record created
   - Trigger processing

### Day 3 (Wednesday): Conversation Persistence

#### Morning (4 hours)
1. **Add Database Schema**
   ```typescript
   // /lib/db/schema.ts
   export const conversations = pgTable('conversations', {
     id: uuid('id').defaultRandom().primaryKey(),
     userId: text('user_id').notNull(),
     companyId: uuid('company_id').notNull(),
     title: text('title'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   export const messages = pgTable('messages', {
     id: uuid('id').defaultRandom().primaryKey(),
     conversationId: uuid('conversation_id').references(() => conversations.id),
     role: text('role').notNull(),
     content: text('content').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Run Migration**
   ```bash
   npm run db:generate
   npm run db:push
   ```

#### Afternoon (4 hours)
1. **Create Conversation Service**
   ```typescript
   // /lib/services/conversation.service.ts
   export async function createConversation(userId: string, companyId: string) {
     return await db.insert(conversations).values({
       userId,
       companyId,
       title: 'New Conversation',
     }).returning();
   }
   
   export async function addMessage(conversationId: string, message: {
     role: 'user' | 'assistant';
     content: string;
   }) {
     return await db.insert(messages).values({
       conversationId,
       ...message,
     }).returning();
   }
   ```

2. **Update Chat API**
   ```typescript
   // Add to /app/(chat)/api/chat/route.ts
   import { createConversation, addMessage } from '@/lib/services/conversation.service';
   
   // In POST handler, after getting response:
   const conversation = await createConversation(userId, companyId);
   await addMessage(conversation.id, { role: 'user', content: userMessage });
   await addMessage(conversation.id, { role: 'assistant', content: aiResponse });
   ```

### Day 4 (Thursday): Analytics Foundation

#### Morning (4 hours)
1. **Create Analytics Tables**
   ```typescript
   // Add to /lib/db/schema.ts
   export const chatEvents = pgTable('chat_events', {
     id: uuid('id').defaultRandom().primaryKey(),
     companyId: uuid('company_id').notNull(),
     userId: text('user_id').notNull(),
     eventType: text('event_type').notNull(), // 'message', 'tool_use', 'feedback'
     metadata: jsonb('metadata'),
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Create Analytics Service**
   ```typescript
   // /lib/services/analytics.service.ts
   export async function trackChatEvent(event: {
     companyId: string;
     userId: string;
     eventType: string;
     metadata?: any;
   }) {
     return await db.insert(chatEvents).values(event);
   }
   ```

#### Afternoon (4 hours)
1. **Add Analytics to Chat Flow**
   ```typescript
   // Update chat API to track events
   await trackChatEvent({
     companyId,
     userId,
     eventType: 'message',
     metadata: {
       messageLength: message.length,
       hasTools: toolCalls.length > 0,
     }
   });
   ```

2. **Create Basic Analytics API**
   ```typescript
   // /app/api/admin/analytics/chat/route.ts
   export async function GET(request: NextRequest) {
     const stats = await db.select({
       totalMessages: count(),
       uniqueUsers: countDistinct(chatEvents.userId),
     }).from(chatEvents);
     
     return NextResponse.json(stats);
   }
   ```

### Day 5 (Friday): Integration Testing & Documentation

#### Morning (4 hours)
1. **End-to-End Testing**
   - Test complete chat flow with persistence
   - Verify document upload and processing
   - Check analytics collection
   - Test with multiple users/companies

2. **Performance Testing**
   ```bash
   # Run load tests
   npm run test:load
   
   # Monitor response times
   # Check for memory leaks
   # Verify rate limiting
   ```

#### Afternoon (4 hours)
1. **Documentation Updates**
   - Update README with setup instructions
   - Document API endpoints
   - Create admin user guide
   - Add troubleshooting section

2. **Week 1 Review & Planning**
   - List completed items
   - Document blockers
   - Plan Week 2 priorities
   - Update project board

## Daily Standup Template

### Format
```
Yesterday: What was completed
Today: What will be worked on
Blockers: Any issues preventing progress
Metrics: Key numbers (tests passing, response time, etc.)
```

### Success Criteria
- [ ] Chat interface validated and working
- [ ] Document upload UI created
- [ ] Conversation persistence implemented
- [ ] Basic analytics tracking enabled
- [ ] All tests passing
- [ ] Documentation updated

## Troubleshooting Guide

### Common Issues

1. **Pinecone Connection Failed**
   ```bash
   # Check API key
   echo $PINECONE_API_KEY
   
   # Test connection
   curl https://api.pinecone.io/indexes \
     -H "Api-Key: $PINECONE_API_KEY"
   ```

2. **OpenAI Rate Limiting**
   ```typescript
   // Add exponential backoff
   import { retry } from '@/lib/utils/retry';
   
   const response = await retry(() => openai.chat.completions.create(...), {
     maxAttempts: 3,
     delay: 1000,
   });
   ```

3. **Database Migration Issues**
   ```bash
   # Reset database
   npm run db:push --force
   
   # Check schema
   npm run db:studio
   ```

## Resources & Links

### Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Pinecone Docs](https://docs.pinecone.io)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Stack Auth Docs](https://docs.stack-auth.com)

### Internal Resources
- Codebase: `/Users/spencerpro/benefitschatbot`
- Environment vars: `.env.local`
- Test data: `/tests/fixtures`

## Week 2 Preview

### Planned Tasks
1. Complete analytics dashboard UI
2. Implement conversation history view
3. Add feedback collection
4. Extensive Q&A testing
5. Performance optimization
6. Security audit preparation

### Prerequisites
- Week 1 tasks completed
- Test environment stable
- All core components validated
- Team aligned on priorities