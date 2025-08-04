# Benefits AI Platform - Master Technical Specification v3.0
*Complete technical documentation and development guide*

**Document Authority**: This is the single source of truth for all technical specifications, architecture decisions, and development protocols. All other specification documents are superseded by this document.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Core Features](#core-features)
5. [Authentication & Security](#authentication--security)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Development Protocols](#development-protocols)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Guide](#deployment-guide)
11. [Performance Requirements](#performance-requirements)
12. [Compliance & Security](#compliance--security)

---

## Executive Summary

The Benefits AI Platform is a multi-tenant, enterprise SaaS solution that transforms employee benefits management through conversational AI, visual analytics, and intelligent automation. The platform serves four primary user personas with role-based access control and complete tenant isolation.

### Key Capabilities
- **Conversational AI**: Natural language benefits assistance with xAI Grok-2-1212
- **Visual Tools**: Interactive plan comparison, cost calculators, and dashboards
- **Multi-Tenant Architecture**: Complete data isolation with subdomain routing
- **Document Intelligence**: RAG-powered knowledge base with semantic search
- **Real-time Analytics**: Usage tracking, engagement metrics, and business insights
- **Enterprise Integration**: SSO, SCIM, and external system connectors

### User Personas
- **Platform Administrators**: Full platform access across all tenants
- **Company Administrators**: Company-wide management and configuration
- **HR Administrators**: Employee support and benefits management
- **Employees**: Self-service benefits access and enrollment

---

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    A[Web Frontend - Next.js 15] --> B[Authentication Layer - Stack Auth]
    B --> C[API Layer - Next.js API Routes]
    C --> D[Business Logic Layer]
    D --> E[Database - Neon PostgreSQL]
    D --> F[AI Services - xAI Grok / OpenAI]
    D --> G[Vector Database - Pinecone]
    D --> H[Cache Layer - Redis]
    C --> I[External Integrations]
    
    subgraph "Multi-Tenant Context"
        J[Tenant Isolation]
        K[Row-Level Security]
        L[Company Scoping]
    end
    
    D --> J
    E --> K
    C --> L
```

### Multi-Tenant Data Isolation

The platform implements strict tenant isolation using:

1. **Database Level**: Row-level security (RLS) policies
2. **Application Level**: Tenant context enforcement
3. **API Level**: Company ID validation on all requests
4. **Authentication Level**: Organization-scoped user sessions

### Scalability Design

- **Horizontal Scaling**: Stateless API design for auto-scaling
- **Caching Strategy**: Multi-layer caching (Redis, CDN, Browser)
- **Database Optimization**: Connection pooling and query optimization
- **Edge Computing**: Vercel Edge Runtime for global performance

---

## Technology Stack

### Frontend Stack
```yaml
Framework: Next.js 15.3.0-canary.31
Language: TypeScript 5.3.3
Styling: Tailwind CSS 3.4.1
UI Components: shadcn/ui (Radix-based)
State Management: React Context + Zustand 5.0.2
Forms: React Hook Form + Zod validation
Animation: Framer Motion 11.11.17
Icons: Lucide React
```

### Backend Stack
```yaml
Runtime: Node.js 20+ with Edge Runtime
API Framework: Next.js API Routes
Database: Neon PostgreSQL (Serverless)
ORM: Drizzle ORM 0.35.3
Cache: Redis (Upstash)
Background Jobs: Vercel Cron
File Storage: Vercel Blob Storage
```

### AI & ML Stack
```yaml
Primary LLM: xAI Grok-2-1212
Fallback LLM: OpenAI GPT-4-turbo
AI Framework: Vercel AI SDK 5.0.0-canary.3
Embeddings: OpenAI text-embedding-3-small
Vector Database: Pinecone
Document Processing: PDF.js + OCR
```

### Authentication & Security
```yaml
Authentication: Stack Auth 2.8.22
Session Management: JWT with refresh tokens
Multi-Factor Auth: TOTP, SMS, Email
SSO Support: Google, Microsoft, Okta
Authorization: Role-Based Access Control (RBAC)
```

### Infrastructure & DevOps
```yaml
Hosting: Vercel (Edge Network)
CDN: Vercel Edge Network
Database: Neon (Serverless PostgreSQL)
Monitoring: Vercel Analytics + Sentry
CI/CD: GitHub Actions + Vercel
Package Manager: pnpm
Build Tool: Next.js + Turbopack
```

---

## Core Features

### 1. Conversational AI System

#### Natural Language Processing
- **Intent Recognition**: 95%+ accuracy across 20+ benefit-related intents
- **Context Management**: Multi-turn conversation with 100k token memory
- **Personalization**: User-specific responses based on enrollment data
- **Multi-Modal Output**: Text, interactive cards, charts, and documents

#### AI Tools Available
```typescript
interface AITools {
  searchKnowledge: "RAG-powered document search";
  comparePlans: "Multi-dimensional plan comparison";
  calculateBenefitsCost: "Scenario-based cost modeling";
  showBenefitsDashboard: "Personalized benefits overview";
  showCostCalculator: "Interactive cost estimation";
  findProviders: "Network provider search";
  checkEligibility: "Real-time eligibility verification";
  explainTerms: "Benefits terminology clarification";
  scheduleReminder: "Deadline and enrollment reminders";
  generateReport: "Custom benefits analysis reports";
}
```

### 2. Visual Benefits Tools

#### Plan Comparison Engine
- Side-by-side comparison of up to 4 benefit plans
- Multi-dimensional analysis (cost, coverage, network size)
- Personalized recommendations based on user profile
- Family scenario modeling with dependent calculations
- Interactive filtering and sorting capabilities

#### Cost Calculator
- Real-time cost estimation with tax implications
- Scenario modeling (best/worst case with confidence intervals)
- HSA/FSA optimization recommendations
- Annual projections with monthly breakdown
- Family member cost allocation

#### Benefits Dashboard
- Personalized coverage summary with utilization tracking
- Deductible progress with visual indicators
- Important dates countdown (enrollment, claims deadlines)
- Recent claims overview with categorization
- Unused benefits alerts and recommendations
- Quick action buttons for common tasks

### 3. Document Intelligence System

#### Document Processing Pipeline
```yaml
Supported Formats: [PDF, DOCX, TXT, HTML, XLSX]
Max File Size: 50MB per document
Processing Steps:
  1. Content Extraction: OCR + text parsing
  2. Semantic Chunking: 800-token chunks with overlap
  3. Embedding Generation: OpenAI text-embedding-3-small
  4. Vector Indexing: Pinecone with metadata
  5. Quality Validation: Content accuracy scoring
```

#### Knowledge Base Features
- **Semantic Search**: Natural language document queries
- **Hybrid Retrieval**: Combines semantic and keyword search
- **Re-ranking**: Results ordered by relevance and recency
- **Source Attribution**: Transparent citation tracking
- **Version Control**: Document update history and rollback

### 4. Multi-Tenant Management

#### Company Administration
- **Company Creation**: Self-service onboarding wizard
- **Brand Customization**: Logo, colors, and styling options
- **User Management**: Bulk import/export, role assignment
- **Subscription Management**: Tier limits and usage tracking
- **Integration Setup**: SSO configuration and API keys

#### Data Governance
- **Access Control**: Granular permission system
- **Audit Logging**: Complete activity tracking
- **Data Export**: GDPR-compliant data portability
- **Retention Policies**: Configurable data lifecycle management

---

## Authentication & Security

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as Stack Auth
    participant A as Application
    participant D as Database
    
    U->>S: Sign In Request
    S->>S: Validate Credentials
    S->>A: Authentication Callback
    A->>D: Lookup/Create User Record
    D->>A: User + Company Data
    A->>A: Set Tenant Context
    A->>U: Authenticated Session
```

### Security Implementation

#### Row-Level Security (RLS)
```sql
-- Multi-tenant data isolation
CREATE POLICY tenant_isolation ON users
    USING (company_id = current_setting('app.company_id')::uuid);

-- Platform admin exception
CREATE POLICY platform_admin_access ON users
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = current_user_id() 
            AND role = 'platform_admin'
        )
    );
```

#### Role-Based Access Control
```typescript
enum UserRole {
    PLATFORM_ADMIN = "platform_admin",  // Cross-tenant access
    COMPANY_ADMIN = "company_admin",     // Company-wide access  
    HR_ADMIN = "hr_admin",              // Employee support access
    EMPLOYEE = "employee"               // Self-service only
}

interface Permissions {
    platform_admin: ["*"];
    company_admin: [
        "company:*", "benefits:*", "employees:*", 
        "analytics:view", "documents:*"
    ];
    hr_admin: [
        "employees:view", "conversations:view", 
        "documents:read", "escalations:manage"
    ];
    employee: ["self:*", "benefits:view", "documents:read"];
}
```

#### Security Controls
- **Session Management**: JWT with 8-hour expiry and refresh tokens
- **Rate Limiting**: API endpoint protection (1000 req/min per tenant)
- **Input Validation**: Zod schema validation on all endpoints
- **Output Sanitization**: XSS protection and CSP headers
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Audit Logging**: Complete activity tracking for compliance

---

## Database Schema

### Core Tables Overview

```sql
-- Multi-tenant foundation
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stack_org_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stack_user_id TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT users_email_company_unique UNIQUE(email, company_id)
);

-- Benefits management
CREATE TABLE benefit_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- health, dental, vision, life, etc.
    provider TEXT NOT NULL,
    monthly_premium_employee DECIMAL(10,2),
    monthly_premium_family DECIMAL(10,2),
    deductible_individual DECIMAL(10,2),
    out_of_pocket_max_individual DECIMAL(10,2),
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true
);

-- Conversation tracking
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document management
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    processing_status VARCHAR(50) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes and Performance
```sql
-- Performance indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_stack_user_id ON users(stack_user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_benefit_plans_company_id ON benefit_plans(company_id);

-- Full-text search
CREATE INDEX idx_documents_content_fts ON documents 
    USING gin(to_tsvector('english', content));
```

---

## API Documentation

### Authentication Endpoints

#### POST /api/onboarding
Complete user onboarding after Stack Auth signup.

**Request Body:**
```typescript
{
    stackUserId: string;
    email: string;
    userType: 'platform_admin' | 'company_admin' | 'hr_admin' | 'employee';
    companyName?: string;
    companyDomain?: string;
    firstName: string;
    lastName: string;
    department?: string;
}
```

**Response:**
```typescript
{
    success: boolean;
    message: string;
    user?: UserRecord;
    error?: string;
}
```

### Core API Endpoints

#### GET/POST /api/chat
Handle conversational AI interactions.

#### GET /api/history
Retrieve user's conversation history.

#### POST /api/files/upload
Upload documents for processing.

#### GET /api/suggestions
Get AI-powered benefits suggestions.

### Admin API Endpoints

#### GET /api/admin/companies
List all companies (platform admin only).

#### GET /api/admin/users
Manage users across companies.

#### GET/POST /api/admin/documents
Company document management.

### Error Handling
All API endpoints return standardized error responses:
```typescript
interface APIError {
    error: string;
    details?: string;
    code?: number;
    timestamp: string;
}
```

---

## Development Protocols

### Code Standards

#### File Organization
```
app/
├── (auth)/          # Authentication pages
├── (chat)/          # Chat interface
├── admin/           # Platform admin interface
├── company-admin/   # Company admin interface  
├── api/             # API endpoints
└── globals.css      # Global styles

components/          # Reusable UI components
├── ui/             # Base UI components (shadcn/ui)
├── chat/           # Chat-specific components
├── admin/          # Admin interface components
└── benefits/       # Benefits tool components

lib/
├── db/             # Database configuration and schema
├── ai/             # AI service integrations
├── auth/           # Authentication utilities
└── utils/          # Shared utilities

types/              # TypeScript type definitions
hooks/              # Custom React hooks
```

#### Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase with descriptive names
- **Functions**: camelCase with verb-noun pattern
- **Variables**: camelCase, avoid abbreviations
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase with descriptive names

#### TypeScript Guidelines
- Use strict type checking with no `any` types
- Define interfaces for all data structures
- Use type unions for controlled string values
- Implement proper error handling with typed exceptions

### Development Workflow

#### Git Workflow
1. **Feature Branches**: Create from `main` with descriptive names
2. **Commits**: Use conventional commit format
3. **Pull Requests**: Require code review and CI passing
4. **Merging**: Use squash and merge for clean history

#### Testing Requirements
- **Unit Tests**: 80% code coverage minimum
- **Integration Tests**: All API endpoints tested
- **E2E Tests**: Critical user journeys automated
- **Performance Tests**: Load testing for key operations

#### Code Review Process
1. **Automated Checks**: Linting, formatting, type checking
2. **Security Review**: Scan for vulnerabilities
3. **Performance Review**: Check for performance impacts
4. **Manual Review**: Logic, architecture, and maintainability

---

## Testing Strategy

### Test Pyramid

#### Unit Tests (70%)
- All utility functions
- Component logic and state management
- API route handlers
- Database operations

#### Integration Tests (20%)
- API endpoint integration
- Database integration
- External service integration
- Authentication flows

#### End-to-End Tests (10%)
- Complete user journeys
- Cross-browser compatibility
- Performance benchmarks
- Security validation

### Testing Tools
```yaml
Unit Testing: Vitest + Testing Library
E2E Testing: Playwright
API Testing: Supertest
Performance: Lighthouse CI
Security: OWASP ZAP
Coverage: Vitest coverage
```

### Continuous Testing
- **Pre-commit**: Lint, format, type check
- **Pull Request**: Full test suite + coverage report
- **Staging**: E2E tests + performance benchmarks
- **Production**: Health checks + monitoring

---

## Deployment Guide

### Environment Configuration

#### Required Environment Variables
```bash
# Database
POSTGRES_URL=postgresql://user:pass@host/db?sslmode=require
POSTGRES_DIRECT_URL=postgresql://user:pass@host/db?sslmode=require

# Authentication (Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_public_key
STACK_SECRET_SERVER_KEY=your_secret_key

# AI Services
XAI_API_KEY=your_xai_key
OPENAI_API_KEY=your_openai_key

# Vector Database
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_environment

# File Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Deployment Pipeline

#### Vercel Deployment
1. **Environment Setup**: Configure all required variables
2. **Build Configuration**: Custom build command with migration
3. **Edge Functions**: Deploy API routes to edge network
4. **Domain Configuration**: Custom domain with SSL
5. **Monitoring Setup**: Analytics and error tracking

#### Database Migration
```bash
# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed

# Verify deployment
pnpm db:check
```

### Production Monitoring

#### Health Checks
- **Application**: Endpoint availability and response times
- **Database**: Connection pool and query performance
- **AI Services**: API availability and response quality
- **Authentication**: Login success rates and session health

#### Performance Metrics
- **Response Times**: <500ms for 95th percentile
- **Uptime**: 99.9% availability target
- **Error Rates**: <0.1% error rate
- **User Experience**: Core Web Vitals compliance

---

## Performance Requirements

### Response Time Targets
- **Chat First Response**: <500ms
- **AI Tool Execution**: <2s
- **Page Load Time**: <1s (75th percentile)
- **API Response**: <200ms (95th percentile)
- **Document Processing**: <5s for 50-page documents
- **Search Results**: <300ms

### Scalability Targets
- **Concurrent Users**: 10,000 active users
- **Message Throughput**: 1,000 messages/second
- **API Requests**: 5,000 requests/second
- **Storage per Tenant**: 100GB document storage
- **Document Processing**: 1,000 uploads/hour

### Optimization Strategies
- **Database**: Query optimization and connection pooling
- **Caching**: Multi-layer caching (Redis, CDN, browser)
- **CDN**: Global content delivery for static assets
- **Edge Computing**: API routes deployed to edge locations
- **Code Splitting**: Dynamic imports for optimal bundle sizes

---

## Compliance & Security

### Security Framework

#### Data Protection
- **Encryption at Rest**: AES-256-GCM for all stored data
- **Encryption in Transit**: TLS 1.3 with perfect forward secrecy
- **Key Management**: Automated rotation every 90 days
- **Access Logging**: Complete audit trail for all data access

#### Privacy Controls
- **Data Minimization**: Collect only necessary information
- **Purpose Limitation**: Use data only for specified purposes
- **Retention Policies**: Automatic data deletion after retention period
- **User Rights**: Data portability, rectification, and deletion

### Compliance Standards

#### Supported Frameworks
- **SOC 2 Type II**: Security, availability, and confidentiality
- **ISO 27001**: Information security management
- **GDPR**: European data protection regulation
- **CCPA**: California consumer privacy act
- **HIPAA-Ready**: Healthcare data protection (when enabled)

#### Audit Requirements
- **Access Logs**: 7-year retention for all system access
- **Change Logs**: Complete record of all system modifications
- **Security Events**: Real-time monitoring and alerting
- **Compliance Reports**: Quarterly compliance assessments

### Incident Response

#### Security Incident Process
1. **Detection**: Automated monitoring and manual reporting
2. **Assessment**: Classify severity and determine impact
3. **Containment**: Isolate affected systems and data
4. **Investigation**: Determine root cause and extent
5. **Remediation**: Fix vulnerabilities and restore service
6. **Communication**: Notify stakeholders and authorities
7. **Review**: Post-incident analysis and improvements

---

## Conclusion

This technical specification provides the complete blueprint for the Benefits AI Platform. It serves as the authoritative guide for all development, deployment, and operational activities.

### Key Success Factors
1. **Strict Adherence**: Follow all protocols and standards outlined
2. **Security First**: Prioritize security and compliance in all decisions
3. **Performance Focus**: Maintain performance targets throughout development
4. **User Experience**: Design with user needs and workflows in mind
5. **Scalability**: Build for growth and enterprise requirements

### Document Maintenance
This specification is a living document that should be updated as the platform evolves. All changes must be reviewed and approved by the technical leadership team.

**Last Updated**: August 1, 2025  
**Version**: 3.0  
**Next Review**: September 1, 2025

---

*This document supersedes all previous technical specifications, architecture documents, and development guides.*
