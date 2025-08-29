# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Firebase-based Benefits Assistant Chatbot - a multi-tenant, AI-powered benefits management platform that transforms employee benefits decisions through conversational AI, visual analytics, and intelligent automation. The project has been migrated from PostgreSQL/Stack Auth to Firebase/Google Cloud.

**Current Version**: 3.1.0  
**Status**: MVP (Single-tenant, migrating to multi-tenant)  
**Framework**: Next.js 15 with TypeScript  
**Deployment**: Firebase Hosting
**AI Provider**: Vertex AI (Google Gemini models) 
## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **UI Components**: Radix UI primitives
- **State Management**: React Context + SWR for data fetching
- **Icons**: Lucide React, Radix Icons
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation

### Backend & Infrastructure
- **Authentication**: Firebase Auth (custom claims for RBAC)
- **Database**: Firestore (NoSQL document database)
- **Storage**: Firebase Cloud Storage
- **Functions**: Firebase Cloud Functions
- **AI/ML**: 
  - Vertex AI (Google Gemini models)
  - OpenAI GPT-4 (fallback)
  - Anthropic Claude (fallback)
- **Search**: Vector embeddings in Pinecone
- **Email**: Resend
- **Caching**: Redis (rate limiting)

### Development Tools
- **Linting**: Biome.js (replacing ESLint)
- **Formatting**: Biome.js
- **Testing**: Vitest + React Testing Library + Playwright
- **Deployment**: Firebase CLI
- **Package Manager**: pnpm (as specified in package.json)

## Quick Start Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server with Turbo
pnpm run dev

# Start development with Firebase emulators
firebase emulators:start &
pnpm run dev
```

### Building & Testing
```bash
# Build application
pnpm run build

# Type checking
pnpm run typecheck

# Run tests
pnpm test                    # Unit tests with coverage
pnpm run test:document-upload # Document processing tests

# Linting & Formatting
pnpm run lint                # Next.js + Biome linting
pnpm run lint:fix            # Auto-fix linting issues  
pnpm run format              # Format code with Biome
```

### Firebase & Deployment
```bash
# Firebase deployment
firebase deploy

# Pre-deployment checks
pnpm run pre-deploy

# Validate production readiness  
pnpm run validate-pow
```

### Admin & User Management
```bash
# Create platform admin user
pnpm run create-admin

# Assign super admin role
pnpm run assign-super-admin

# List all users
pnpm run list-users

# Emergency auth fixes
pnpm run fix-auth
pnpm run reset-auth
```

## Architecture Overview

### Directory Structure
```
benefitschatbot/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes (/login, /register)
│   ├── (chat)/            # Main chat interface (/)
│   ├── admin/             # Platform admin portal
│   ├── super-admin/       # Super admin dashboard
│   ├── company-admin/     # Company admin portal
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui base components
│   ├── admin/             # Admin-specific components
│   ├── super-admin/       # Super admin components
│   └── guides/            # User guide components
├── lib/                   # Core business logic
│   ├── ai/                # AI tools, prompts, providers
│   ├── firebase/          # Firebase client & admin SDKs
│   ├── services/          # Business service layer
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── hooks/                 # Custom React hooks
├── context/               # React contexts (Auth, Theme)
├── functions/             # Firebase Cloud Functions
├── scripts/               # Utility and maintenance scripts
└── tests/                 # Test files (unit, e2e, routes)
```

### Authentication & Authorization
The app uses Firebase Auth with custom claims for role-based access:

**User Roles**:
- `super-admin`: Full platform access
- `platform_admin`: Platform administration  
- `company_admin`: Company-specific admin access
- `hr_admin`: HR management within company
- `employee`: Personal benefits access only

**Protected Routes**:
- `/super-admin/*` - Super admin only
- `/company-admin/*` - Company admin and above
- `/admin/*` - Platform admin and above
- API routes protected via middleware

### AI Chat System
- **Models**: Gemini-2.0-flash-exp (primary)
- **Tools**: Benefits comparison, cost calculation, document search
- **RAG**: Vector search with Vertex AI
- **Streaming**: Server-sent events for real-time responses
- **Function Calling**: Benefits-specific AI tools

### Data Architecture
**Firebase Collections Structure**:
```
/companies/{companyId}
  /users/{userId}
  /benefitPlans/{planId}
  /documents/{docId}
  /conversations/{chatId}
    /messages/{messageId}
```

## Key Configuration Files

### Environment Variables Required
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI Provider Keys
GOOGLE_GENERATIVE_AI_API_KEY=    # Primary AI provider


# External Services (to be replaced with Google/Firebase equivalents)
RESEND_API_KEY=                 # Email service (migrate to Firebase Extensions)
REDIS_URL=                      # Caching/rate limiting (migrate to Firestore/Memorystore)
PINECONE_API_KEY=               # Vector search (migrate to Vertex AI Vector Search)
```
### TypeScript Configuration
- **Target**: ESNext with strict mode enabled
- **Module Resolution**: Bundler (Next.js optimized)
- **Path Mapping**: `@/*` maps to project root
- **Strict**: All TypeScript strict checks enabled
- **Special**: Excludes test files from main compilation

### Code Quality
- **Biome.js** for linting and formatting
- **Line Width**: 80 characters
- **Indent**: 2 spaces
- **Quotes**: Single quotes (JavaScript), double quotes (JSX)
- **Semicolons**: Always required
- **Trailing Commas**: Always in arrays/objects

## Testing Strategy

### Unit Tests (Vitest)
```bash
pnpm test                    # Run all unit tests with coverage
pnpm test -- --watch        # Watch mode for development
```

**Coverage Target**: 80%+ for critical business logic
**Test Files**: `__tests__/` directory and `.test.ts` files
**Setup**: `vitest.setup.ts` with React Testing Library

### E2E Tests (Playwright)  
```bash
npx playwright test         # Run end-to-end tests
npx playwright test --ui    # Interactive test runner
```

**Browser Coverage**: Chromium (primary), Firefox/Safari (optional)
**Test Scenarios**: Authentication flow, chat interactions, admin functions

### Integration Tests
- API route testing
- Database operations
- Firebase functions
- Document processing pipeline

## Development Patterns

### Firebase Integration Pattern
When adding new Firebase features:

1. **Client SDK**: Initialize in `/lib/firebase.ts`
2. **Admin SDK**: Server operations in `/lib/firebase/admin.ts`
3. **Types**: Define interfaces in `/lib/types/`
4. **Service Layer**: Business logic in `/lib/services/`
5. **Security Rules**: Update `firestore.rules` and `storage.rules`

### AI Tool Development
For new AI capabilities:

1. **Tool Definition**: Create in `/lib/ai/tools/[tool-name].ts`
2. **Schema**: Define Zod schema for parameters
3. **Implementation**: Use Firebase data sources
4. **Testing**: Add integration tests
5. **Registration**: Export in `/lib/types.ts`

### Component Architecture
- **UI Components**: Use shadcn/ui as base, extend with custom variants
- **Business Components**: Keep in `/components/` with clear separation
- **Hooks**: Extract reusable logic to custom hooks
- **Context**: Use React Context sparingly, prefer SWR for data

## Deployment & Infrastructure

### Firebase
- **Hosting**: Static assets and SPA fallback
- **Functions**: Background processing, webhooks
- **Storage**: Document uploads and processing
- **Security**: Rules-based access control

### Monitoring & Observability
- **Error Tracking**: Built-in Next.js error boundaries
- **Performance**: Vercel Web Vitals monitoring
- **AI Metrics**: Token usage and response time tracking
- **Business Metrics**: Custom analytics dashboard

## Development Workflow

### Feature Development
1. **Planning**: Check `claude.md` for current status and next priorities
2. **Branch**: Create feature branch from `main`
3. **Development**: 
   - Write failing tests first (TDD approach)
   - Implement feature with TypeScript strict mode
   - Update documentation as needed
4. **Quality**: 
   - Run `pnpm run lint:fix && pnpm run format`
   - Ensure tests pass with `pnpm test`
   - Check types with `pnpm run typecheck`
5. **Review**: Submit PR with verification evidence

### Code Standards
- **No `any` types** without documented TODO
- **Error Handling**: Always handle promises and potential errors
- **Accessibility**: Follow WCAG guidelines for UI components
- **Performance**: Optimize for Core Web Vitals
- **Security**: Validate all inputs, sanitize outputs

## Current Status & Next Steps

### Recently Completed
- ✅ Firebase Authentication migration from Stack Auth
- ✅ Firestore data layer with real-time updates
- ✅ Multi-role admin portals (super-admin, company-admin)
- ✅ Document upload and processing pipeline
- ✅ AI chat with benefits-specific tools
- ✅ Responsive UI with dark/light themes

### In Development
- 🟡 Gemini AI integration optimization
- 🟡 Advanced document processing with Document AI
- 🟡 Real-time collaboration features
- 🟡 Enhanced analytics and reporting

### Technical Debt
- 📋 Comprehensive test coverage (currently minimal)
- 📋 Error boundaries and fallback UIs
- 📋 Performance optimization for large datasets
- 📋 Accessibility audit and improvements
- 📋 Security audit and penetration testing

## AI-Specific Development Notes

### Working with Claude
When developing with Claude, always provide:
1. **Context**: Share relevant file paths and current implementation
2. **Requirements**: Be specific about functionality needed
3. **Constraints**: Mention Firebase limitations and project patterns
4. **Evidence**: Show test results and verification steps

### Common Patterns
- **Firebase Queries**: Use compound indexes for complex queries
- **Real-time Updates**: Implement optimistic updates with error recovery
- **Error Handling**: Graceful degradation when Firebase services are unavailable
- **Performance**: Implement pagination and lazy loading for large datasets

### AI Tool Guidelines
- **Input Validation**: Always use Zod schemas
- **User Context**: Include user role and company context
- **Rate Limiting**: Implement per-user and per-company limits
- **Fallbacks**: Have backup providers for AI service failures

---

**Last Updated**: January 2025  
**Maintainer**: Development Team  
**Version**: 3.1.0

For the most current development status, always check `claude.md` for real-time progress tracking.