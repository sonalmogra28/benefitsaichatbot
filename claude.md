# claude.md - Benefits AI Demo-First Development

## Project Context

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
