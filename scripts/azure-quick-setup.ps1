# Azure Quick Setup Script
# Run this after logging in with: az login

Write-Host "🚀 Setting up Azure resources for Benefits Assistant Chatbot..." -ForegroundColor Green

# Set variables
$resourceGroupName = "benefits-chatbot-rg-dev"
$location = "East US"
$appName = "benefits-chatbot-dev"

# Get current subscription
$subscription = az account show --query "id" -o tsv
Write-Host "Using subscription: $subscription" -ForegroundColor Cyan

# Create resource group
Write-Host "📦 Creating resource group..." -ForegroundColor Yellow
az group create --name $resourceGroupName --location $location

# Create Cosmos DB
Write-Host "🗄️ Creating Cosmos DB..." -ForegroundColor Yellow
az cosmosdb create --name "benefits-chatbot-cosmos-dev" --resource-group $resourceGroupName --locations regionName=$location --kind GlobalDocumentDB --default-consistency-level Session --enable-serverless

# Create Storage Account
Write-Host "💾 Creating Storage Account..." -ForegroundColor Yellow
az storage account create --name "benefitschatbotdev" --resource-group $resourceGroupName --location $location --sku Standard_LRS --kind StorageV2

# Create Redis Cache
Write-Host "🔴 Creating Redis Cache..." -ForegroundColor Yellow
az redis create --name "benefits-chatbot-redis-dev" --resource-group $resourceGroupName --location $location --sku Basic --vm-size c0

# Create Application Insights
Write-Host "📊 Creating Application Insights..." -ForegroundColor Yellow
az monitor app-insights component create --app "benefits-chatbot-insights-dev" --location $location --resource-group $resourceGroupName

# Create Key Vault
Write-Host "🔐 Creating Key Vault..." -ForegroundColor Yellow
az keyvault create --name "benefits-chatbot-vault-dev" --resource-group $resourceGroupName --location $location --enable-rbac-authorization

# Create App Service Plan
Write-Host "🏗️ Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create --name "benefits-chatbot-plan-dev" --resource-group $resourceGroupName --location $location --sku B1 --is-linux

# Create Web App
Write-Host "🌐 Creating Web App..." -ForegroundColor Yellow
az webapp create --name $appName --resource-group $resourceGroupName --plan "benefits-chatbot-plan-dev" --runtime "NODE|18-lts"

# Get connection strings and keys
Write-Host "🔑 Getting connection strings..." -ForegroundColor Yellow

# Cosmos DB
$cosmosEndpoint = az cosmosdb show --name "benefits-chatbot-cosmos-dev" --resource-group $resourceGroupName --query "documentEndpoint" -o tsv
$cosmosKey = az cosmosdb keys list --name "benefits-chatbot-cosmos-dev" --resource-group $resourceGroupName --query "primaryMasterKey" -o tsv

# Storage Account
$storageConnectionString = az storage account show-connection-string --name "benefitschatbotdev" --resource-group $resourceGroupName --query "connectionString" -o tsv

# Redis Cache
$redisHost = az redis show --name "benefits-chatbot-redis-dev" --resource-group $resourceGroupName --query "hostName" -o tsv
$redisKey = az redis list-keys --name "benefits-chatbot-redis-dev" --resource-group $resourceGroupName --query "primaryKey" -o tsv

# Application Insights
$appInsightsConnectionString = az monitor app-insights component show --app "benefits-chatbot-insights-dev" --resource-group $resourceGroupName --query "connectionString" -o tsv

# Key Vault
$keyVaultUrl = az keyvault show --name "benefits-chatbot-vault-dev" --resource-group $resourceGroupName --query "properties.vaultUri" -o tsv

Write-Host "✅ Azure resources created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Connection Information:" -ForegroundColor Cyan
Write-Host "Cosmos DB Endpoint: $cosmosEndpoint" -ForegroundColor White
Write-Host "Storage Connection String: $storageConnectionString" -ForegroundColor White
Write-Host "Redis Host: $redisHost" -ForegroundColor White
Write-Host "App Insights Connection String: $appInsightsConnectionString" -ForegroundColor White
Write-Host "Key Vault URL: $keyVaultUrl" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env.local with these connection strings" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host "3. Test the application" -ForegroundColor White
