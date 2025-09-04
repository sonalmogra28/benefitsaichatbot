# Benefits Assistant Chatbot v2.0

# Benefits Assistant Chatbot  
Multi‑tenant AI platform empowering employees to understand, compare, and manage workplace benefits through natural conversation, intuitive visuals, and smart automation.

---

## 🗂️ Project Snapshot
| Item | Status |
|-----|--------|
| **Current Version** | 3.1.0 |
| **Deployment Target** | Firebase / Google Cloud |
| **Primary Model** | Vertex AI (OpenAI & Anthropic as fallback) |
| **Database Migration** | PostgreSQL ➜ Firebase |

---

## ✅ Delivered Capability
- Conversational benefits assistant with friendly personality  
- Visual decision aids  
  - Plan comparison cards  
  - Benefits dashboard  
  - Interactive cost calculator  
- AI tools using mock data  
  - `comparePlans`, `calculateBenefitsCost`, `showBenefitsDashboard`, `showCostCalculator`  
- Basic authentication (NextAuth)  
- Chat history persistence  
- Responsive design  

---

## 🚧 What’s Under Construction
| Workstream | Description |
|------------|-------------|
| **Multi‑tenant schema** | Segment data for employers, providers, and employees |
| **Real data integration** | Replace mock data with live benefits plans |
| **Document processing** | Ingest and parse plan PDFs, DOCX, and images |
| **Knowledge base** | Centralized reference library for AI context |
| **Admin portals** | Employer & provider control panels |
| **SSO integration** | OAuth2/SAML for enterprise logins |
| **Analytics engine** | Usage metrics and benefits insights |
| **Monitoring & alerts** | Sentry, logging, and automated health checks |
| **Compliance hardening** | SOC 2, HIPAA alignment, audit tooling |

---

## 🛠️ Technology Stack
### Frontend
- Next.js 15 • TypeScript • Tailwind CSS  
- shadcn/ui • SWR • React 19  

### Backend & Cloud
- Firebase Auth • Firestore • Cloud Storage  
- Cloud Functions • Vertex AI & Vector Search  
- Resend (email) • Caching layer  

### Development
- pnpm • Biome (lint/format)  
- Vitest & React Testing Library  
- Playwright (E2E) • Firebase CLI  

---

## 🏗️ System Architecture
┌───────────────────────────── Clients ─────────────────────────────┐
│ Web App │ Mobile App │ API Consumers │
└──────┬────┴───────┬──────┴───────┬────────────────────────────────┘
│ │ │
└────────────┴──────────────┴──────────────┐
▼
Firebase Hosting / CDN
(Routing + Auth)
│
┌──────────────────────────┬──────────────────────────┐
│ │ │
Chat Function Benefits Function Admin Function
└──────────┬───────────────┴───────────────┬──────────┘
│ │
▼ ▼
AI Orchestration (Vertex AI)
│
┌──────────────┬──────────────┬──────────────┐
│ Firestore DB │ Cloud Funcs │ Vertex Vector │
│ │ │ Search │
└──────────────┴──────────────┴──────────────┘

yaml
Copy code

---

## 🚀 Quick Start for Developers
```bash
# 1. Clone the repo
git clone https://github.com/your-org/benefits-chatbot.git
cd benefitschatbot

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local
# Fill in required keys before proceeding

# 4. Validate configuration
pnpm run validate-env

# 5. Start development server
pnpm run dev
Essential Environment Variables
NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, …

FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

RESEND_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY (or equivalent)
See .env.example for the full list.

Google Cloud Setup
Enable Firestore, Vertex AI, and Document AI APIs

Create Vertex AI index & endpoint, plus Document AI processor

Grant service account roles:

roles/aiplatform.user

roles/documentai.editor

Add to .env.local:

GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION

VERTEX_AI_PROJECT_ID, VERTEX_AI_LOCATION

VERTEX_AI_INDEX_ID, VERTEX_AI_INDEX_ENDPOINT_ID

DOCUMENT_AI_PROCESSOR_ID

🧪 Testing & Verification
Command	Purpose
pnpm test	Run unit tests with coverage
pnpm test:integration	Integration suite
pnpm test:e2e	Playwright end‑to‑end tests
pnpm typecheck	TypeScript checking
pnpm lint	Biome + ESLint
pnpm run build	Production build validation
./scripts/verify.sh	Full pre‑commit verification (typecheck, lint, test, build, security)

📁 Key Directories
vbnet
Copy code
app/           → Next.js App Router pages & APIs
components/    → Reusable UI pieces
lib/           → AI tools, DB layer, utilities
public/        → Static assets
scripts/       → Maintenance & deploy scripts
tests/         → Unit / integration / E2E tests
docs/          → Specs & audit reports
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

📄 License
Proprietary – All rights reserved

This project is under active development. Feedback and collaboration are welcome.
