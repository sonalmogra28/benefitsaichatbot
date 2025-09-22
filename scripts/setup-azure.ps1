# Azure Setup Script for Benefits Chatbot
# Complete infrastructure deployment with cost optimization
# Total Monthly Cost: $343-609

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "benefits-chatbot-rg-$Environment",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey,
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId = ""
)

Write-Host "🚀 Setting up Azure infrastructure for Benefits Chatbot..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Estimated Monthly Cost: $343-609" -ForegroundColor Cyan

# Check if Azure CLI is installed
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Blue
    exit 1
}

# Login to Azure
Write-Host "🔐 Logging into Azure..." -ForegroundColor Blue
az login

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "📋 Setting subscription to $SubscriptionId..." -ForegroundColor Blue
    az account set --subscription $SubscriptionId
}

# Create resource group
Write-Host "📦 Creating resource group..." -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Get current user's object ID for Key Vault access
Write-Host "👤 Getting current user information..." -ForegroundColor Blue
$currentUser = az ad signed-in-user show --query id --output tsv
if (!$currentUser) {
    Write-Host "❌ Failed to get current user information. Please ensure you're logged in." -ForegroundColor Red
    exit 1
}

# Deploy Azure resources using Bicep
Write-Host "🏗️ Deploying Azure resources using Bicep..." -ForegroundColor Blue
$deploymentResult = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file azure/main.bicep `
    --parameters environment=$Environment location=$Location openaiApiKey=$OpenAIApiKey appServicePrincipalId=$currentUser `
    --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Azure deployment completed successfully!" -ForegroundColor Green
    
    # Get deployment outputs
    Write-Host "📋 Getting deployment outputs..." -ForegroundColor Blue
    $outputs = az deployment group show --resource-group $ResourceGroupName --name main --query properties.outputs --output json | ConvertFrom-Json
    
    Write-Host "`n🎯 Deployment Summary:" -ForegroundColor Green
    Write-Host "App Service URL: $($outputs.appServiceUrl.value)" -ForegroundColor White
    Write-Host "Static Web App URL: $($outputs.staticWebAppUrl.value)" -ForegroundColor White
    Write-Host "Cosmos DB Endpoint: $($outputs.cosmosDbEndpoint.value)" -ForegroundColor White
    Write-Host "Storage Account: $($outputs.storageAccountName.value)" -ForegroundColor White
    Write-Host "Key Vault URL: $($outputs.keyVaultUrl.value)" -ForegroundColor White
    Write-Host "App Insights Key: $($outputs.appInsightsInstrumentationKey.value)" -ForegroundColor White
    
    # Store secrets in Key Vault
    Write-Host "`n🔐 Storing secrets in Key Vault..." -ForegroundColor Blue
    $keyVaultName = "benefits-chatbot-vault-$Environment"
    
    # Get connection strings
    $cosmosConnectionString = az cosmosdb keys list --name "benefits-chatbot-cosmos-$Environment" --resource-group $ResourceGroupName --type connection-strings --query connectionStrings[0].connectionString --output tsv
    $storageConnectionString = az storage account show-connection-string --name "benefitschatbot$(az group show --name $ResourceGroupName --query id --output tsv | ForEach-Object { [System.Web.HttpUtility]::UrlDecode($_) } | ForEach-Object { [System.Guid]::NewGuid().ToString("N").Substring(0,8) })" --resource-group $ResourceGroupName --query connectionString --output tsv
    
    # Store secrets
    az keyvault secret set --vault-name $keyVaultName --name "cosmos-connection-string" --value $cosmosConnectionString
    az keyvault secret set --vault-name $keyVaultName --name "storage-connection-string" --value $storageConnectionString
    az keyvault secret set --vault-name $keyVaultName --name "openai-api-key" --value $OpenAIApiKey
    
    Write-Host "`n💰 Monthly Cost Breakdown:" -ForegroundColor Cyan
    Write-Host "Azure App Service (Basic B1): $55" -ForegroundColor White
    Write-Host "Azure Cosmos DB (Serverless): $50-150" -ForegroundColor White
    Write-Host "Azure Blob Storage (Hot): $20-40" -ForegroundColor White
    Write-Host "Azure Application Insights: $30-80" -ForegroundColor White
    Write-Host "Azure Static Web Apps (Standard): $9" -ForegroundColor White
    Write-Host "Azure Communication Services: $10-20" -ForegroundColor White
    Write-Host "Azure Key Vault: $3-10" -ForegroundColor White
    Write-Host "Azure Cache for Redis (Basic): $16" -ForegroundColor White
    Write-Host "OpenAI API (External): $150-250" -ForegroundColor White
    Write-Host "TOTAL: $343-609/month" -ForegroundColor Green
    
    # Create environment file
    Write-Host "`n📝 Creating environment configuration..." -ForegroundColor Blue
    $envContent = @"
# Azure Configuration
AZURE_COSMOS_CONNECTION_STRING=$cosmosConnectionString
AZURE_STORAGE_CONNECTION_STRING=$storageConnectionString
OPENAI_API_KEY=$OpenAIApiKey
AZURE_KEY_VAULT_URL=$($outputs.keyVaultUrl.value)
AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING=$($outputs.appInsightsInstrumentationKey.value)

# App Configuration
NODE_ENV=production
AZURE_ENVIRONMENT=$Environment
RESOURCE_GROUP_NAME=$ResourceGroupName
"@
    
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
    
    Write-Host "`n🎉 Azure infrastructure setup completed successfully!" -ForegroundColor Green
    Write-Host "Environment file created: .env.production" -ForegroundColor White
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Deploy your application to the App Service" -ForegroundColor White
    Write-Host "2. Configure custom domain (optional)" -ForegroundColor White
    Write-Host "3. Set up monitoring alerts" -ForegroundColor White
    Write-Host "4. Configure backup policies" -ForegroundColor White
    
} else {
    Write-Host "❌ Azure deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
