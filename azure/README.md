# Azure Infrastructure Setup for Benefits Chatbot

This directory contains all the necessary files and scripts to deploy the Benefits Chatbot application to Azure.

## 🏗️ Architecture Overview

The Benefits Chatbot uses a cost-optimized Azure architecture designed for scalability and reliability:

- **Azure App Service** (Basic B1) - Web hosting and auto-scaling
- **Azure Cosmos DB** (Serverless) - NoSQL database for chat data
- **Azure Blob Storage** - Document and image storage
- **Azure Application Insights** - Monitoring and analytics
- **Azure Key Vault** - Secrets management
- **Azure Static Web Apps** - Frontend hosting
- **Azure Communication Services** - Email and SMS
- **Azure Cache for Redis** - Caching and session storage

## 💰 Cost Breakdown

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| App Service | Basic B1 | $55 |
| Cosmos DB | Serverless | $50-150 |
| Blob Storage | Hot LRS | $20-40 |
| Application Insights | Standard | $30-80 |
| Static Web Apps | Standard | $9 |
| Communication Services | Standard | $10-20 |
| Key Vault | Standard | $3-10 |
| Redis Cache | Basic C0 | $16 |
| **Total Azure** | | **$193-359** |
| **OpenAI API** | External | **$150-250** |
| **TOTAL** | | **$343-609** |

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and configured
2. **PowerShell** (Windows) or **PowerShell Core** (Linux/Mac)
3. **Node.js 18+** and **npm**
4. **OpenAI API Key**

### Option 1: Quick Setup (Recommended for Development)

```powershell
# Clone the repository
git clone <repository-url>
cd benefitsaichatbot-383

# Run quick setup
.\scripts\quick-azure-setup.ps1 -Environment "dev" -OpenAIApiKey "your-openai-api-key"
```

### Option 2: Full Infrastructure Setup

```powershell
# Run full setup with all services
.\scripts\setup-azure.ps1 -Environment "dev" -OpenAIApiKey "your-openai-api-key" -Location "East US"
```

### Deploy Application

```powershell
# Deploy the application to Azure
.\scripts\deploy-app.ps1 -Environment "dev"
```

### Set Up Monitoring

```powershell
# Configure monitoring and alerts
.\scripts\setup-monitoring.ps1 -Environment "dev"
```

## 📁 File Structure

```
azure/
├── main.bicep                 # Main deployment template
├── app-service.bicep          # App Service configuration
├── cosmos-db.bicep           # Cosmos DB configuration
├── storage.bicep             # Storage account configuration
├── static-web-app.bicep      # Static Web App configuration
├── communication-services.bicep # Communication Services
├── monitoring.bicep          # Monitoring and logging
├── azure-config.json         # Configuration settings
└── README.md                 # This file

scripts/
├── setup-azure.ps1           # Full infrastructure setup
├── quick-azure-setup.ps1     # Quick setup for development
├── deploy-app.ps1            # Application deployment
├── setup-monitoring.ps1      # Monitoring configuration
└── deploy-azure.ps1          # Original deployment script
```

## 🔧 Configuration

### Environment Variables

After deployment, configure these environment variables in your App Service:

```bash
# Azure Services
AZURE_COSMOS_CONNECTION_STRING=<from Cosmos DB>
AZURE_STORAGE_CONNECTION_STRING=<from Storage Account>
AZURE_KEY_VAULT_URL=<from Key Vault>
AZURE_APPLICATION_INSIGHTS_KEY=<from Application Insights>

# External Services
OPENAI_API_KEY=<your-openai-api-key>

# Application
NODE_ENV=production
AZURE_ENVIRONMENT=dev
```

### Key Vault Secrets

The following secrets are automatically stored in Key Vault:

- `cosmos-connection-string`
- `storage-connection-string`
- `openai-api-key`

## 📊 Monitoring

### Application Insights

- **URL**: Available in Azure Portal
- **Metrics**: CPU, Memory, Response Time, Request Count
- **Logs**: Application logs, errors, and custom events

### Alerts

The following alerts are configured:

- **High CPU Usage** (>80%) - Warning
- **High Memory Usage** (>85%) - Warning
- **High Error Rate** (>10 failed requests) - Critical
- **High Response Time** (>5 seconds) - Warning

### Dashboards

Custom dashboards are created for:
- Application Performance
- Business Metrics
- Error Tracking

## 🔒 Security

### Key Vault

- All sensitive configuration stored in Azure Key Vault
- Managed identity for secure access
- Soft delete enabled (90 days retention)

### Network Security

- HTTPS only for all services
- CORS configured for allowed origins
- Firewall rules for additional security

### Data Protection

- Encryption at rest for all data
- Encryption in transit (TLS 1.2+)
- Regular backups configured

## 🚀 Deployment Environments

### Development
- **Resource Group**: `benefits-chatbot-rg-dev`
- **App Service**: `benefits-chatbot-dev`
- **Cost**: ~$200-300/month

### Staging
- **Resource Group**: `benefits-chatbot-rg-staging`
- **App Service**: `benefits-chatbot-staging`
- **Cost**: ~$300-400/month

### Production
- **Resource Group**: `benefits-chatbot-rg-prod`
- **App Service**: `benefits-chatbot-prod`
- **Cost**: ~$400-600/month

## 🔄 CI/CD Pipeline

### GitHub Actions (Recommended)

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Deploy to Azure
        run: |
          az webapp deployment source config-zip \
            --resource-group benefits-chatbot-rg-prod \
            --name benefits-chatbot-prod \
            --src deployment.zip
```

### Azure DevOps

1. Create new pipeline
2. Select "Azure App Service deployment"
3. Configure build and release stages
4. Set up environment-specific configurations

## 🛠️ Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check Azure CLI login: `az login`
   - Verify resource group exists
   - Check subscription permissions

2. **Application Won't Start**
   - Check environment variables
   - Verify Node.js version (18+)
   - Check Application Insights logs

3. **Database Connection Issues**
   - Verify Cosmos DB connection string
   - Check firewall rules
   - Verify database and containers exist

4. **Storage Issues**
   - Check storage account connection string
   - Verify container permissions
   - Check CORS settings

### Logs and Debugging

```bash
# View App Service logs
az webapp log tail --name benefits-chatbot-dev --resource-group benefits-chatbot-rg-dev

# View Application Insights
az monitor app-insights component show --app benefits-chatbot-insights-dev --resource-group benefits-chatbot-rg-dev
```

## 📈 Scaling

### Horizontal Scaling

- **App Service**: Configure auto-scaling rules
- **Cosmos DB**: Serverless automatically scales
- **Storage**: No scaling needed

### Vertical Scaling

- **App Service**: Upgrade to higher SKU (S1, S2, P1, P2)
- **Cosmos DB**: Switch to provisioned throughput
- **Redis**: Upgrade to higher tier

## 🔄 Backup and Recovery

### Automated Backups

- **Cosmos DB**: Continuous backup (30 days)
- **Storage**: Point-in-time restore
- **Key Vault**: Soft delete (90 days)

### Manual Backups

```bash
# Backup Cosmos DB
az cosmosdb sql database backup create --account-name benefits-chatbot-cosmos-dev --resource-group benefits-chatbot-rg-dev --database-name benefits-db

# Backup Storage Account
az storage blob service-properties update --account-name benefitschatbotdev --static-website --404-document 404.html --index-document index.html
```

## 📞 Support

For issues and questions:

1. **Azure Portal**: Check service health and metrics
2. **Application Insights**: Review application logs
3. **GitHub Issues**: Report bugs and feature requests
4. **Documentation**: Check this README and inline comments

## 🔄 Updates and Maintenance

### Regular Tasks

- **Monthly**: Review costs and optimize
- **Weekly**: Check monitoring alerts
- **Daily**: Monitor application health
- **As needed**: Update dependencies and security patches

### Cost Optimization

- Use Azure Cost Management
- Set up budget alerts
- Review and optimize resource usage
- Consider reserved instances for production

---

**Total Estimated Setup Time**: 30-45 minutes
**Monthly Operating Cost**: $343-609
**Scalability**: Auto-scaling enabled
**Reliability**: 99.9% SLA with Azure services
