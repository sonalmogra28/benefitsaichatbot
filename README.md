# Benefits Assistant Chatbot v2.0

A multi-tenant, AI-powered benefits management platform that transforms employee benefits decisions through conversational AI, visual analytics, and intelligent automation.

## 🚀 Current Status

**Version**: MVP (Single-tenant)  
**Stack**: Next.js 15, TypeScript, Drizzle ORM, Neon PostgreSQL, Vercel AI SDK  
**Deployment**: Vercel (Production)  
**AI Model**: xAI Grok-2 (with OpenAI GPT-4 fallback ready)

### ✅ Completed Features
- Basic conversational AI with benefits personality
- Visual components:
  - Plan comparison cards
  - Benefits dashboard
  - Interactive cost calculator
- AI tools (currently using mock data):
  - `comparePlans`
  - `calculateBenefitsCost`
  - `showBenefitsDashboard`
  - `showCostCalculator`
- Basic authentication (NextAuth)
- Chat history persistence
- Responsive design

### 🚧 In Development
- Multi-tenant database schema
- Real data integration
- Document processing
- Knowledge base
- Admin portals (Employer & Provider)
- SSO integration
- Analytics engine

## 📚 Documentation

### Core Documents
- **[Technical Specification v2.0](./docs/tech-spec-v2.md)** - Complete technical architecture
- **[Product Requirements Document](./docs/prd-v2.md)** - Business requirements and success metrics
- **[System Architecture](./docs/architecture-v2.md)** - Detailed system design with Tree-of-Thought analysis
- **[Product Blueprint](./docs/blueprint-v2.md)** - Vision, personas, and non-functional requirements
- **[Style Guide](./docs/style-guide-v2.md)** - Design system and UI standards
- **[Development Roadmap](./docs/roadmap-v2.md)** - 18-week phased implementation plan
- **[Claude Code Execution System](./docs/claude-code-execution-system.md)** - Step-by-step implementation guide
- **[Development Control System](./claude.md)** - Real-time development tracking and verification

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │   API Client    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Vercel Edge/CDN      │
                    │  (Auth, Rate Limiting)  │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
    ┌────▼─────┐  ┌──────────────┐  ┌─────────────┐  ┌─▼──────────┐
    │   Chat   │  │   Benefits   │  │  Analytics  │  │   Admin    │
    │  Service │  │   Service    │  │   Service   │  │  Service   │
    └────┬─────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘
         │               │                   │                │
         └───────────────┴───────────────────┴────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    AI Orchestration     │
                    │  (Multi-Model Routing)  │
                    └────────────┬────────────┘
                                 │
    ┌────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────────────┐
    │Firebase    │ │Cloud         │ │ Firestore   │ │ Vertex AI Vector Search│
    │Hosting     │ │Functions     │ │ (Database)  │ │ (Vector DB)            │
    └────────────┘ └──────────────┘ └─────────────┘ └────────────────────────┘
```

## 🚦 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Firebase CLI
- Firestore database
- Cloud Storage bucket

### Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/benefits-chatbot.git
cd benefits-chatbot

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Never commit real `.env` files or secrets to version control.

# Required environment variables:
FIREBASE_PROJECT_ID=       # Firebase project identifier
FIREBASE_CLIENT_EMAIL=     # Service account client email
FIREBASE_PRIVATE_KEY=      # Base64-encoded private key
POSTGRES_URL=              # Neon PostgreSQL URL
POSTGRES_URL_NON_POOLING=  # Neon direct connection
AUTH_SECRET=               # NextAuth secret (generate with: openssl rand -base64 32)
OPENAI_API_KEY=            # For GPT-4 fallback
XAI_API_KEY=               # For Grok-2 (primary)
```

#### Google Cloud Setup

To use Vertex AI and Document AI features:

1. Enable the Vertex AI and Document AI APIs in your Google Cloud project.
2. Create a Vertex AI index and endpoint, and note their IDs.
3. Create a Document AI processor for the documents you need to process.
4. Grant your service account the following IAM roles:
   - Vertex AI User (`roles/aiplatform.user`)
   - Document AI Editor (`roles/documentai.editor`)
5. Add the following variables to your `.env.local` file:
   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_CLOUD_LOCATION`
   - `VERTEX_INDEX_ID`
   - `VERTEX_ENDPOINT_ID`
   - `DOCUMENT_AI_PROCESSOR_ID`

### Development
```bash
# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev

# Run tests
pnpm test

# Check types
pnpm tsc --noEmit

# Lint and format
pnpm lint:fix
pnpm format
```

### Database Management
```bash
# Generate migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Push schema changes (dev only)
pnpm db:push
```

## 🧪 Testing Strategy

### Unit Tests
```bash
pnpm test:unit          # Run unit tests
pnpm test:unit:watch    # Watch mode
pnpm test:unit:coverage # With coverage
```

### Integration Tests
```bash
pnpm test:integration   # Run integration tests
pnpm test:e2e           # Run E2E tests with Playwright
```

### Verification Suite
```bash
# Run complete verification before committing
./scripts/verify.sh

# This runs:
# - Type checking
# - Linting
# - Tests
# - Build verification
# - Security audit
```

## 🚀 Deployment

### Vercel Deployment (Production)
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls
```

### Environment Configuration
- **Development**: Local PostgreSQL, development API keys
- **Staging**: Neon PostgreSQL (staging), test API keys
- **Production**: Neon PostgreSQL (production), production API keys

## 📁 Project Structure

```
benefits-chatbot/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (chat)/            # Chat interface
│   ├── api/               # API routes
│   └── provider/          # Provider admin portal
├── components/            # React components
│   ├── custom/            # Business-specific components
│   └── ui/                # shadcn/ui components
├── lib/                   # Core business logic
│   ├── ai/                # AI tools and prompts
│   │   ├── tools/         # AI function tools
│   │   ├── prompts/       # System prompts
│   │   └── context/       # Context management
│   ├── db/                # Database layer
│   │   ├── schema/        # Drizzle schemas
│   │   ├── repositories/  # Data access layer
│   │   └── migrations/    # SQL migrations
│   └── utils/             # Utility functions
├── public/                # Static assets
├── scripts/               # Build and maintenance scripts
├── tests/                 # Test files
├── docs/                  # Documentation
└── claude.md              # Development tracking
```

## 🔐 Security

### Authentication & Authorization
- **Provider Admin**: Full platform access
- **Employer Admin**: Company-specific access
- **Employee**: Personal benefits access only

### Data Protection
- End-to-end encryption (TLS 1.3)
- Row-level security in PostgreSQL
- Encrypted environment variables
- No PII/PHI storage in logs

### Compliance
- GDPR-ready data handling
- CCPA compliance features
- SOC 2 Type II practices
- HIPAA-ready architecture

## 🤝 Contributing

### Development Workflow
1. Review [claude.md](./claude.md) for current status
2. Pick a task from the roadmap
3. Create a feature branch
4. Implement with proof-of-work
5. Update claude.md with evidence
6. Submit PR with verification

### Code Standards
- TypeScript strict mode
- No `any` without TODO
- 80%+ test coverage
- All PRs must pass CI

### CI Test Process
Our GitHub Actions pipeline runs `npm test` with coverage on every push and pull request. The build fails if any test fails or if coverage falls below the configured thresholds (lines: 80%, statements: 80%, functions: 80%, branches: 15%). Run `npm test` locally before pushing to verify your changes.

### Using with Windsurf/Cascade
When using AI coding assistants:
1. Always provide full context from claude.md
2. Verify generated code against our patterns
3. Run verification suite before committing
4. Document any deviations in claude.md

## 📊 Monitoring & Analytics

### Production Monitoring
- **Vercel Analytics**: Page views, Web Vitals
- **Error Tracking**: Sentry (to be configured)
- **AI Metrics**: Token usage, response times
- **Business Metrics**: Custom analytics dashboard

### Health Checks
- `/api/health` - System health
- `/api/health/db` - Database connectivity
- `/api/health/ai` - AI service availability

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check connection
pnpm exec tsx scripts/check-db.ts

# Reset connection pool
pnpm db:push --force
```

#### Build Failures
```bash
# Clear cache
rm -rf .next
pnpm install --force
pnpm build
```

#### Type Errors
```bash
# Regenerate types
pnpm db:generate
pnpm tsc --noEmit
```

## 📞 Support

### Development Team
- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@company.com
- **Business Questions**: product@company.com

### Resources
- [Internal Wiki](./docs/wiki)
- [API Documentation](./docs/api)
- [Deployment Guide](./docs/deployment)

## 📄 License

Proprietary - All rights reserved

---

**Note**: This is an active development project. Always check [claude.md](./claude.md) for the latest development status and [roadmap-v2.md](./docs/roadmap-v2.md) for upcoming features.
