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
3. End-to-end Development Roadmap (`docs/DEVELOPMENT_ROADMAP.md`)
4. Technical Debt Remediation Plan (`docs/TECHNICAL_DEBT_REMEDIATION_PLAN.md`)
5. High-Risk Areas & Mitigation Plan
6. Next Sprint Backlog & Monetization Use-Cases

## 3. Phase Gating Strategy
(See `docs/DEVELOPMENT_ROADMAP.md` for full phase details)

### Phase 0-9: Initial Features & Enhancements
- **Status:** Completed through Phase 9.

### Phase 10-14: Technical Debt Remediation
- **Objective:** Address critical gaps in foundational systems, core features, and production readiness.
- **Plan:** See `docs/TECHNICAL_DEBT_REMEDIATION_PLAN.md` for detailed tasks, deliverables, and prompts.
- **Gate:** Each sub-task requires live testing and verification before proceeding to the next.

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

## 7. Development Roadmap & Remediation Plan
For the full Gantt chart and assignments, see `docs/DEVELOPMENT_ROADMAP.md`.
For the detailed technical debt remediation plan, see `docs/TECHNICAL_DEBT_REMEDIATION_PLAN.md`.

## 8. Next Sprint Backlog
The current focus is on completing the Technical Debt Remediation Plan (Phases 10-14). The previous backlog is superseded by this priority.

## 9. Monetization Use-Cases
- Enterprise Subscription for Multi-Tenant Analytics
- White-Label RAG Chatbot Generator
- Premium Support & SLAs for Large Enterprises

## 10. Appendix: Custom Claude Code Instructions
See `toolsets/claude_custom_instructions.jsonc` for prompt templates, sub-agent definitions, and gate criteria.
