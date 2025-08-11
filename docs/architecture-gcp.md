# System Architecture (GCP Edition)

This document describes the architecture of the Benefits Assistant Chatbot platform, now hosted entirely on Google Cloud Platform (GCP).

## Core Principles

- **Scalability**: All components are designed to scale horizontally.
- **Security**: Security is layered, from the edge to the database.
- **Managed Services**: We prefer managed services to reduce operational overhead.
- **CI/CD**: The entire infrastructure is managed via code and deployed automatically.

## Architecture Diagram

```
                               +-----------------------------+
                               |      End Users (Web)        |
                               +--------------+--------------+
                                              |
                                              |
                          +-------------------v-------------------+
                          |      Google Cloud Load Balancer       |
                          | (with Cloud Armor for WAF & DDoS)     |
                          +-------------------+-------------------+
                                              |
                                              |
                     +------------------------v------------------------+
                     |             Google Cloud Run Service             |
                     |      (Next.js Application Container)            |
                     |                                                 |
                     |  +------------------+   +--------------------+  |
                     |  |  Authentication  |   |  API Endpoints     |  |
                     |  |  (Stack Auth)    |   |  (Benefits, etc.)  |  |
                     |  +------------------+   +--------------------+  |
                     +-----------+----------------------+--------------+
                                 |                      |
            +--------------------+----------------------+----+
            |                    |                           |
+-----------v-----------+ +------v------+ +------------------v------------------+
| Google Secret Manager | | Google Cloud| |       Google Vertex AI            |
| (API Keys, Secrets)   | |  Storage    | |                                   |
|                       | | (Documents) | | +-------------+  +--------------+ |
+-----------------------+ +-------------+ | | Gemini Model|  | Vector Search| |
                                          | | (LLM)       |  | (Embeddings) | |
                                          | +-------------+  +--------------+ |
                                          +-----------------------------------+
                                 |
+--------------------------------v---------------------------------+
|                        Google Cloud SQL (PostgreSQL)              |
|                   (with IAM Auth & Private IP)                     |
|                                                                  |
| +-----------------+  +------------------+  +-------------------+ |
| | User Data       |  | Benefits Data    |  | Conversation Hist | |
| +-----------------+  +------------------+  +-------------------+ |
+------------------------------------------------------------------+

```

## Components

- **Google Cloud Load Balancer**: The entry point for all traffic. It provides SSL termination, and with Cloud Armor, protection against common web attacks.
- **Google Cloud Run**: Hosts the containerized Next.js application. It automatically scales based on traffic, providing a serverless and cost-effective hosting solution.
- **Google Cloud SQL**: A fully managed PostgreSQL database. It's configured with private IP and IAM database authentication for maximum security.
- **Google Vertex AI**:
  - **Gemini**: The core large language model used for conversational AI.
  - **Vector Search**: Used for efficient similarity searches on document embeddings.
- **Google Secret Manager**: Securely stores all application secrets, such as API keys and database credentials.
- **Google Cloud Storage**: Stores user-uploaded documents and other static assets.
- **Google Cloud Build**: The CI/CD engine that automatically tests, builds, and deploys the application.
- **Google Cloud's operations suite**: Provides logging, monitoring, and alerting for the entire platform.

## Data Flow Example: User Asks a Question

1.  A user sends a message from the web client.
2.  The request hits the **Google Cloud Load Balancer**.
3.  The request is forwarded to a **Google Cloud Run** container instance.
4.  The Next.js application authenticates the user with **Stack Auth**.
5.  The application sends the user's prompt to **Vertex AI Gemini**.
6.  If the prompt requires context from documents, the application queries **Vertex AI Vector Search**.
7.  The LLM generates a response, which is streamed back to the user.
8.  The conversation is saved in the **Google Cloud SQL** database.
