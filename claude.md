# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Firebase-based Benefits Assistant Chatbot - a multi-tenant, AI-powered benefits management platform that transforms employee benefits decisions through conversational AI, visual analytics, and intelligent automation. The project has been migrated from PostgreSQL/Stack Auth to Firebase/Google Cloud.

**Current Version**: 3.1.0  
**Status**: MVP (Single-tenant, migrating to multi-tenant)  
**Framework**: Next.js 15 with TypeScript  
**Deployment**: Firebase Hosting
**AI Provider**: Vertex AI (Google Gemini models) 

## RAG Implementation Plan

We are implementing a Retrieval-Augmented Generation (RAG) system to allow the chatbot to reference an internal knowledge base of benefits documents.

- **Phase 1 details**:
  - Document loading script ingests source files.
  - Chunks and embeddings stored in Firestore.
  - In-memory similarity search retrieves relevant content.
- **Phase 2 upgrade steps**:
  - Adopt Vertex AI Vector Search for scalable retrieval.
  - Write data ingestion script to populate the index.
  - Update retrieval logic to query the managed service.
- **Current progress**: Phase 1 pipeline is operational with Firestore-backed storage and in-memory search.
- **Next steps**: Stand up Vertex AI Vector Search, ingest existing embeddings, and refactor retrieval to use the new index.

### Phase 1: RAG with Firestore (In Progress)

*   **Goal**: Get a functional end-to-end RAG pipeline working quickly.
*   **Status**: Actively being implemented.
*   **Architecture**:
    1.  **Document Loading**: A script (`scripts/process-documents.ts`) reads PDF and DOCX files from the `/data/benefits-documents` directory.
    2.  **Text Extraction**: The script uses `pdf-parse` and `mammoth` to extract text from the documents.
    3.  **Chunking & Embeddings**: The `ragSystem.processDocument` method splits the text into chunks and generates embeddings using a Vertex AI model.
    4.  **Storage**: Both the text chunks and their corresponding embeddings are stored in the `document_chunks` collection in Firestore.
    5.  **Retrieval**: The `ragSystem.vectorSearch` method performs a basic similarity search directly in Firestore by fetching chunks and calculating cosine similarity in-memory.

### Phase 2: Upgrade to Vertex AI Vector Search (Next Step)

*   **Goal**: Transition to a scalable, production-grade vector search solution.
*   **Status**: Planned.
*   **Architecture**:
    1.  **Setup Vertex AI**: Provision a Vector Search index in the Google Cloud project.
    2.  **Data Ingestion**: Write a script to push the embeddings from Firestore (or directly from the source documents) into the Vertex AI Vector Search index.
    3.  **Update Retrieval Logic**: Modify the `ragSystem.vectorSearch` method to query the Vertex AI Vector Search endpoint instead of Firestore.
    4.  **Benefits**: This will provide a highly scalable and performant search solution for the production environment.

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
- **Search**: Vertex AI Vector Search
- **Email**: Resend
- **Caching**: Firestore-based rate limiting or Firebase Memorystore

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
