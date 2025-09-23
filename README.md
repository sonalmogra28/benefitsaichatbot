# Benefits Assistant Chatbot v3.1.0

# Benefits Assistant Chatbot  
Multi‑tenant AI platform empowering employees to understand, compare, and manage workplace benefits through natural conversation, intuitive visuals, and smart automation.

---

## 🗂️ Project Snapshot
| Item | Status |
|-----|--------|
| **Current Version** | 3.1.0 |
| **Deployment Target** | Azure Cloud Services |
| **Primary Model** | Azure OpenAI (with hybrid LLM routing) |
| **Database** | Azure Cosmos DB |
| **Authentication** | Azure AD B2C |
| **Status** | 🚀 Production Ready (Phase 1) |

---

## ✅ Delivered Capability
- **Conversational AI Assistant** with friendly personality and context awareness
- **Visual Decision Aids**  
  - Plan comparison cards with detailed analysis
  - Interactive benefits dashboard
  - Cost calculator with savings recommendations
- **AI-Powered Tools** with real Azure OpenAI integration
  - `comparePlans`, `calculateBenefitsCost`, `showBenefitsDashboard`, `showCostCalculator`
  - Document processing and vector search
  - Hybrid LLM routing for optimal performance
- **Enterprise Authentication** via Azure AD B2C
- **Multi-tenant Architecture** with data isolation
- **Real-time Chat** with persistent history
- **Admin Portals** for super-admin and company management
- **Document Management** with Azure Blob Storage
- **Rate Limiting** with Azure Redis Cache
- **Comprehensive Audit Logging** with Azure Application Insights
- **Responsive Design** with modern UI/UX  

---

## 🚧 What's Under Construction
| Workstream | Description | Status |
|------------|-------------|--------|
| **Azure Resource Deployment** | Deploy to Azure App Service and configure production environment | 🔄 In Progress |
| **Azure AD B2C Configuration** | Set up B2C tenant and user flows for production | 🔄 In Progress |
| **Google Workspace Integration** | Full OAuth flow and user synchronization | 📋 Planned |
| **Advanced Analytics** | Enhanced usage metrics and business insights | 📋 Planned |
| **Mobile App** | React Native companion app | 📋 Future |
| **Advanced Document AI** | Enhanced PDF parsing and OCR capabilities | 📋 Future |
| **Compliance Hardening** | SOC 2, HIPAA alignment, audit tooling | 📋 Future |

---

## 🛠️ Technology Stack
### Frontend
- **Next.js 15** • TypeScript • Tailwind CSS  
- **shadcn/ui** • Framer Motion • React 19  
- **Azure MSAL** for authentication

### Backend & Cloud
- **Azure Cosmos DB** for data storage
- **Azure Blob Storage** for document management
- **Azure OpenAI** for AI capabilities
- **Azure AD B2C** for authentication
- **Azure Redis Cache** for rate limiting
- **Azure Application Insights** for monitoring
- **Azure Key Vault** for secrets management

### AI & ML
- **Azure OpenAI** (GPT-4, GPT-3.5-turbo)
- **Hybrid LLM Routing** for optimal performance
- **Vector Search** with Azure AI Search
- **Document Processing** with Azure Document Intelligence

### Development
- **npm** • ESLint • TypeScript  
- **Vitest** & React Testing Library  
- **Playwright** (E2E) • Azure CLI  

---

## 🏗️ System Architecture
```
┌───────────────────────────── Clients ─────────────────────────────┐
│ Web App │ Mobile App │ API Consumers │
└──────┬────┴───────┬──────┴───────┬────────────────────────────────┘
       │            │              │
       └────────────┴──────────────┴──────────────┐
                                                 ▼
                                    Azure App Service
                                    (Next.js + API Routes)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                   ▼               ▼               ▼
            Azure AD B2C    Azure Cosmos DB   Azure Blob Storage
            (Auth)          (Data)            (Documents)
                    │               │               │
                    └───────────────┼───────────────┘
                                   ▼
                            Azure OpenAI + AI Search
                            (AI Processing)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                   ▼               ▼               ▼
            Azure Redis Cache  Azure Key Vault  Azure App Insights
            (Rate Limiting)    (Secrets)        (Monitoring)
```

---

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js 18+ 
- Azure CLI (for deployment)
- Azure account with proper permissions

### Local Development
```bash
# 1. Clone the repo
git clone https://github.com/sonalmogra28/benefitsaichatbot.git
cd benefitsaichatbot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in Azure credentials (see Azure Setup below)

# 4. Start development server
npm run dev
```

### Azure Setup
1. **Azure AD B2C Setup**: Follow [Azure AD B2C Setup Guide](docs/azure-ad-b2c-setup-mograsonal.md)
2. **Azure Resources**: Run [Azure Setup Script](scripts/azure-setup-mograsonal.ps1)
3. **Environment Variables**: Update `.env.local` with Azure connection strings

### Essential Environment Variables
```env
# Azure Core
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Azure Cosmos DB
AZURE_COSMOS_ENDPOINT=https://your-cosmos.documents.azure.com:443/
AZURE_COSMOS_KEY=your-cosmos-key

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-key

# Azure AD B2C
AZURE_AD_B2C_TENANT_NAME=your-tenant.onmicrosoft.com
AZURE_AD_B2C_CLIENT_ID=your-b2c-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-b2c-secret
```

See [Azure Manual Setup Guide](docs/azure-manual-setup.md) for complete configuration.

## 🧪 Testing & Verification
| Command | Purpose |
|---------|---------|
| `npm test` | Run unit tests with coverage |
| `npm run test:integration` | Integration suite |
| `npm run test:e2e` | Playwright end‑to‑end tests |
| `npm run typecheck` | TypeScript checking |
| `npm run lint` | ESLint + TypeScript |
| `npm run build` | Production build validation |
| `npm run dev` | Start development server |

## 📁 Key Directories
```
app/           → Next.js App Router pages & APIs
components/    → Reusable UI pieces
lib/           → AI tools, Azure services, utilities
public/        → Static assets (including brand logos)
scripts/       → Azure setup & deployment scripts
tests/         → Unit / integration / E2E tests
docs/          → Setup guides & documentation
```

## 🚀 Deployment Status

### Phase 1: Core Features (Current)
- ✅ **Codebase Complete**: All initial TODOs implemented
- ✅ **Azure Integration**: Services configured and ready
- ✅ **Authentication**: Azure AD B2C integration
- ✅ **Database**: Cosmos DB with multi-tenant schema
- ✅ **AI Features**: OpenAI integration with hybrid routing
- 🔄 **Azure Deployment**: Resources being created
- 🔄 **Production Setup**: B2C tenant configuration

### Phase 2: Enhanced Features (Planned)
- 📋 **Google Workspace**: Full OAuth integration
- 📋 **Advanced Analytics**: Business intelligence dashboard
- 📋 **Mobile App**: React Native companion
- 📋 **Compliance**: SOC 2, HIPAA alignment
🔐 Security & Compliance
Authentication

Provider Admin: full platform management

Employer Admin: organization-specific control

Employee: personal benefits access only

Data Protection

TLS 1.3 for all traffic

Encrypted environment variables

No PII/PHI stored in logs

Compliance Alignment

GDPR & CCPA-ready practices

SOC 2 Type II procedures

HIPAA-ready architecture

🤝 Contributing Guidelines
Review open tasks and pick an issue

Create a feature branch

Implement with tests and proof‑of‑work

Run the full verification suite

Submit a pull request with context

Coding Standards

TypeScript strict mode

No any unless TODO with follow‑up issue

≥80 % coverage (lines, statements, functions; ≥15 % branches)

CI must pass before merge

Using AI Assistants

Provide full context in prompts

Validate generated code against existing patterns

Document deviations in the PR description

📊 Monitoring & Health
Error Tracking: Sentry (pending configuration)

AI Metrics: token counts, latency

Business Metrics: custom analytics dashboard

Health endpoints:

/api/health – system uptime

/api/health/db – database connectivity

/api/health/ai – model availability

🆘 Support & Contact
Technical issues: open a GitHub issue

Security concerns: security@company.com

Business inquiries: product@company.com

Resources: see docs/ for internal guides, API contracts, and deployment notes.

## 📊 Monitoring & Health
- **Error Tracking**: Azure Application Insights
- **Performance Monitoring**: Real-time metrics and alerts
- **AI Metrics**: Token usage, response times, cost tracking
- **Business Metrics**: User engagement, feature usage analytics
- **Health Endpoints**:
  - `/api/health` – System uptime and status
  - `/api/health/db` – Database connectivity
  - `/api/health/ai` – AI service availability

## 🆘 Support & Contact
- **Technical Issues**: Open a GitHub issue
- **Security Concerns**: Contact via Azure Key Vault
- **Business Inquiries**: Product team contact
- **Documentation**: See `docs/` for setup guides and API contracts

## 📄 License
Proprietary – All rights reserved

This project is under active development. Feedback and collaboration are welcome.

---

## 🎯 Next Steps
1. **Complete Azure Setup**: Follow the Azure AD B2C and resource creation guides
2. **Deploy to Production**: Use the Azure setup scripts to deploy
3. **Test End-to-End**: Verify all features work in the Azure environment
4. **Monitor & Optimize**: Use Azure Application Insights for performance monitoring

**Current Status**: Phase 1 core features are complete and ready for Azure deployment! 🚀
