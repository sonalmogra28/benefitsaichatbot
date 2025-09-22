# Deployment Scripts

This directory contains deployment scripts for the Benefits AI Chatbot application.

## Supported Deployment Targets

- **Firebase** - Google Firebase hosting (default)
- **Cloud Run** - Google Cloud Run serverless containers
- **Azure** - Microsoft Azure App Service with full infrastructure

## Usage

### Bash (Linux/macOS)
```bash
# Deploy to Firebase (default)
./deploy.sh

# Deploy to Cloud Run
./deploy.sh cloud-run

# Deploy to Azure
./deploy.sh azure
```

### PowerShell (Windows)
```powershell
# Deploy to Firebase (default)
.\deploy.ps1

# Deploy to Cloud Run
.\deploy.ps1 -DeploymentTarget cloud-run

# Deploy to Azure
.\deploy.ps1 -DeploymentTarget azure
```

## Prerequisites

### For Firebase Deployment
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project configured

### For Cloud Run Deployment
- Node.js and npm installed
- Google Cloud CLI installed
- Google Cloud project configured
- Docker installed

### For Azure Deployment
- Node.js and npm installed
- Azure CLI installed
- Azure subscription access
- Contributor permissions on Azure subscription

## Environment Variables

### Azure Deployment
```bash
export AZURE_RESOURCE_GROUP="benefits-chatbot-rg"
export AZURE_LOCATION="East US"
export AZURE_APP_NAME="benefits-chatbot"
```

### Firebase Deployment
```bash
export FIREBASE_PROJECT_ID="your-project-id"
export NEXT_PUBLIC_APP_URL="https://your-app.web.app"
```

### Cloud Run Deployment
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export NEXT_PUBLIC_APP_URL="https://your-app.run.app"
```

## What Each Script Does

1. **Environment Check** - Verifies required tools and credentials
2. **Dependency Installation** - Installs npm packages
3. **Code Quality Checks** - Runs linting and type checking
4. **Testing** - Runs unit and integration tests
5. **Build** - Creates production build
6. **Database Migrations** - Runs any necessary database updates
7. **Deployment** - Deploys to the specified target
8. **Health Check** - Verifies the deployment is working

## Azure Infrastructure

The Azure deployment creates a complete infrastructure including:
- Azure App Service (web hosting)
- Azure Cosmos DB (database)
- Azure Blob Storage (file storage)
- Azure Application Insights (monitoring)
- Azure Key Vault (secrets management)
- Azure Static Web Apps (frontend hosting)
- Azure Communication Services (notifications)

## Troubleshooting

### Common Issues

1. **Azure CLI not found**
   - Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
   - Login: `az login`

2. **Firebase CLI not found**
   - Install: `npm install -g firebase-tools`
   - Login: `firebase login`

3. **Google Cloud CLI not found**
   - Install: https://cloud.google.com/sdk/docs/install
   - Login: `gcloud auth login`

4. **Build failures**
   - Check TypeScript errors: `pnpm typecheck`
   - Fix linting issues: `pnpm lint`

## Cost Optimization

The Azure deployment is optimized for cost with:
- Serverless Cosmos DB (pay-per-use)
- Basic App Service plan
- Hot Blob Storage tier
- Basic Application Insights
- Direct OpenAI API integration

**Estimated monthly cost: $343-609** (vs $4,000-8,750 for full enterprise setup)
