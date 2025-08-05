# claude.md - Benefits Chatbot Development Control System

**Last Updated:** 2025-08-05

## 1. Scope & Objectives
 This document replaces the previous Claude Code control system with a phase-gated, self-healing workflow that enforces:
 - Rigorous gate reviews and automated validation
 - Mandatory honesty and transparency: agents must respond truthfully, disclose uncertainties, and avoid fabricated details
- Clear sub-agent roles and sequential chain-of-thought prompting
- Comprehensive data access controls for Admin and Super Admin
- Continuous risk identification and mitigation
- A detailed final development roadmap and next-sprint backlog

## 2. Deliverables Overview
1. Rewritten `claude.md` (this file)
2. Custom Claude Code toolset instructions (`toolsets/claude_custom_instructions.jsonc`)
3. End-to-end Development Roadmap (Phases 0–7)
4. Data Audit Report for Admin & Super Admin profiles
5. High-Risk Areas & Mitigation Plan
6. Next Sprint Backlog & Monetization Use-Cases

## 3. Phase Gating Strategy
### Phase 0: Discovery & Audit ✅
- **0.1:** Codebase & dependency audit ✅
- **0.2:** Data flow mapping for User, Admin, Super Admin ✅
- **Gate 0 Approval:** ❌ BLOCKED - Critical security issues must be resolved:
  - Fix unauthenticated `/api/admin/cleanup-database` endpoint
  - Secure `/api/cron/process-documents` POST method
  - Update vulnerable dependencies
- **Audit Report:** `docs/PHASE0_AUDIT_REPORT.json`
- **Summary:** `docs/PHASE0_AUDIT_SUMMARY.md`

### Phase 1: Core Platform Stabilization
- **1.1:** Stack Auth handler integration (Next.js 15)
- **1.2:** Debug, health-check, and baseline metrics pages
- **Gate 1 Approval:** All core auth and routing tests pass

### Phase 2: Automation & Sub-Agent Integration
- Define Sub-Agents: DataAgent, AuthAgent, QAAgent, DeploymentAgent
- Implement automated validation pipelines (unit, integration, RAG)
- **Gate 2 Approval:** CI/CD pipelines green, code coverage ≥ 90%

### Phase 3: Admin & Super Admin Profile Completion
- **3.1:** Data fields and API endpoints for Admin
- **3.2:** Data fields and API endpoints for Super Admin
- **Gate 3 Approval:** Security review and RBAC tests pass

### Phase 4: Self-Healing & Continuous Validation
- PoW hooks auto-update `claude.md` upon task completion
- Anomaly detection triggers automated rollback or alerts
- **Gate 4 Approval:** Self-healing workflows exercised and validated

### Phase 5: Final Roadmap & Monetization Blueprint
- Detailed milestone schedule and owner assignments
- Monetization proposals and ROI analysis
- **Gate 5 Approval:** Business stakeholder sign-off

### Phase 6: Go-To-Market & Documentation
- User guides, API references, onboarding flows
- Final security and compliance audit
- **Gate 6 Approval:** Production launch readiness

### Phase 7: Optional RAG Refactoring
- Pivot to generic RAG Chatbot Generator (strip benefit-specific features)
- Templating engine for rapid cloning and repurposing
- **Gate 7 Approval:** Demo of new RAG capabilities

## 4. Sub-Agent & Automation Model
| Sub-Agent       | Responsibility                                          |
|-----------------|---------------------------------------------------------|
| **DataAgent**   | Data schema updates, migrations, ETL monitoring         |
| **AuthAgent**   | Stack Auth orchestration, session management           |
| **QAAgent**     | Test generation, sequential chain-of-thought prompts    |
| **DeploymentAgent** | CI/CD orchestration, rollback & health-check triggers |

> **Sequential Chain-of-Thought Prompting:**
> Each AI-driven sub-task must include step-by-step reasoning to ensure traceability.

## 5. Data Pipeline & Admin Profiles
### Data Fields Pulled
- **Admin Profile:** User list, organization settings, usage metrics
- **Super Admin Profile:** All tenant data, system logs, security events

### Access Controls
- Role-based Authorization enforced via middleware.ts
- Auditing hooks log every data access event

## 6. High-Risk Areas & Mitigations
- **Auth Handler Failures:** End-to-end tests, circuit breakers
- **Data Leakage:** Field-level encryption, strict CORS policies
- **Pipeline Anomalies:** Anomaly detection metrics, automated alerts

## 7. Final Development Roadmap
For full Gantt chart and assignments, see `docs/DEVELOPMENT_ROADMAP_PHASE0-7.md`.

## 8. Next Sprint Backlog
1. Enhanced Benefits Analytics Dashboard
2. Multimodal Data Upload (Docs, Images) for RAG
3. Tenant-Specific Customization UI
4. In-Chat Webhook Integration for External APIs

## 9. Monetization Use-Cases
- Enterprise Subscription for Multi-Tenant Analytics
- White-Label RAG Chatbot Generator
- Premium Support & SLAs for Large Enterprises

## 10. Appendix: Custom Claude Code Instructions
See `toolsets/claude_custom_instructions.jsonc` for prompt templates, sub-agent definitions, and gate criteria.
