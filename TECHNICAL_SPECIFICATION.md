# Technical Specification: Benefits Assistant Chatbot v4.0

**Version:** 1.0
**Status:** Proposed

## 1. Introduction

This document provides the technical blueprint for refactoring the Benefits Assistant Chatbot into a single-tenant platform, as defined in `PRODUCT_REQUIREMENTS.md`. It outlines the architecture, data models, and implementation plan, with a focus on creating a user-friendly admin experience and a logical, document-driven AI using Vertex AI.

## 2. System Architecture

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui. **All existing UI components for benefit calculations and visual comparisons will be preserved.** They will be refactored to source data from the new single-tenant Firestore collections.
- **Backend:** Firebase
    - **Authentication:** Firebase Auth for user login.
    - **Database:** Firestore for all platform data (single-tenant model).
    - **Storage:** Firebase Cloud Storage for uploaded benefit documents.
    - **Functions:** Firebase Cloud Functions for background processing (e.g., document ingestion).
- **AI Provider:** Google Vertex AI (Gemini family of models).

## 3. Data Models (Firestore)

The multi-tenant structure will be completely removed. The new, simplified structure is as follows:

- **/users/{userId}:** Stores user information.
  ```json
  {
    "uid": "{userId}",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "employee" // or "super_admin"
  }
  ```
- **/documents/{documentId}:** Stores metadata for uploaded benefit documents.
  ```json
  {
    "id": "{documentId}",
    "name": "2025 Health Plan Summary.pdf",
    "storagePath": "documents/path/to/file.pdf",
    "uploadedAt": "timestamp",
    "extractedText": "...text content of the PDF...",
    "weight": 3 // Default priority, from 1-5
  }
  ```
- **/config/ai_settings:** A singleton document for all AI configurations.
  ```json
  {
    "personality": "You are a helpful and friendly benefits assistant...",
    "tone": "professional", // e.g., 'professional', 'friendly'
    "brandingStyle": "..."
  }
  ```
- **/benefitPlans/{planId}:** Top-level collection for all benefit plans.

## 4. Core Feature Implementation

### 4.1. Super Admin Portal (Ultra User-Friendly)

The portal will be simplified to focus on core tasks. The "Companies" section will be permanently removed.

- **Document Management (`/super-admin/documents`):**
    - A simple UI to upload PDF and Markdown files to Firebase Storage.
    - A list view of all uploaded documents.
    - For each document, a simple dropdown/input to set its **Weight (Priority)** from 1 (lowest) to 5 (highest). This value updates the `weight` field in the document's Firestore record.
    - A button to delete a document (removes from Storage and Firestore).

- **AI Configuration (`/super-admin/ai-config`):**
    - A straightforward form with two fields:
        1.  **AI Personality (Textarea):** A freeform text field for the admin to describe the AI's persona. (e.g., "You are the friendly Benefits Bot for Acme Inc...").
        2.  **Tone of Voice (Dropdown):** A select menu with options like `Professional`, `Friendly`, `Formal`.
    - Saving this form will update the `/config/ai_settings` document.

### 4.2. AI Chat Logic (Vertex AI)

The core of the AI will be a new `/api/chat` API route that orchestrates Retrieval-Augmented Generation (RAG).

**Process Flow:**
1.  Receive the user's question from the frontend.
2.  Authenticate the user's request.
3.  Fetch AI configuration (`personality`, `tone`) from the `/config/ai_settings` document in Firestore.
4.  Fetch all documents from the `/documents` collection and sort them in **descending order of `weight`**. The highest weight will be first.
5.  **Construct a Master Prompt** for the Vertex AI Gemini model. This is the critical step:
    ```
    // System Instruction (built from Firestore data)
    const systemPrompt = `
    ${ai_config.personality}
    Your tone must be ${ai_config.tone}.
    You must answer the user's question using ONLY the information provided in the context documents below. 
    Do not use any external knowledge. 
    At the end of your answer, you MUST cite the name of the document you used, like this: [Source: document_name.pdf].
    `;

    // Context Preparation (built from Firestore data)
    let context = "--- CONTEXT DOCUMENTS ---";
    for (const doc of sortedDocuments) {
      context += `\n\nDOCUMENT NAME: ${doc.name}\nCONTENT:\n${doc.extractedText}`;
    }

    // Final Prompt for Vertex AI
    const finalPrompt = `${systemPrompt}\n\n${context}\n\n--- USER QUESTION ---\n${userQuestion}`;
    ```
6.  Instantiate the Vertex AI client, pass it `finalPrompt`, and stream the generative response back to the client UI.

### 4.3. Document Ingestion (Firebase Function)

- A new Firebase Cloud Function will trigger whenever a file is uploaded to the `documents/` path in Firebase Storage.
- **Function Logic:**
    1.  Read the uploaded file (PDF, MD).
    2.  Extract the raw text content.
    3.  Create a new entry in the `/documents` Firestore collection, storing the file's metadata and the extracted text.

## 5. Next Steps: Task Breakdown

I will not proceed with any of the following tasks until I have your explicit approval. I will create a `TASKS.md` file to track progress and will mark items as complete only after they are done. This ensures full transparency.
