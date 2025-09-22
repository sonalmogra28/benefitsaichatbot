# Quick Azure Setup for Benefits Chatbot
# Minimal setup for development/testing

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey
)

$ResourceGroupName = "benefits-chatbot-rg-$Environment"
$Location = "East US"

Write-Host "🚀 Quick Azure Setup for Benefits Chatbot..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow

# Login to Azure
Write-Host "🔐 Logging into Azure..." -ForegroundColor Blue
az login

# Create resource group
Write-Host "📦 Creating resource group..." -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Deploy Cosmos DB
Write-Host "🗄️ Deploying Cosmos DB..." -ForegroundColor Blue
az cosmosdb create --name "benefits-chatbot-cosmos-$Environment" --resource-group $ResourceGroupName --locations regionName=$Location --capabilities EnableServerless

# Create database and containers
Write-Host "📊 Creating database and containers..." -ForegroundColor Blue
az cosmosdb sql database create --account-name "benefits-chatbot-cosmos-$Environment" --resource-group $ResourceGroupName --name "benefits-db"

# Create containers
$containers = @("chat-messages", "users", "companies", "notifications", "documents", "benefits")
foreach ($container in $containers) {
    Write-Host "Creating container: $container" -ForegroundColor Gray
    az cosmosdb sql container create --account-name "benefits-chatbot-cosmos-$Environment" --resource-group $ResourceGroupName --database-name "benefits-db" --name $container --partition-key-path "/id" --throughput 400
}

# Deploy App Service
Write-Host "🌐 Deploying App Service..." -ForegroundColor Blue
az appservice plan create --name "benefits-chatbot-plan-$Environment" --resource-group $ResourceGroupName --sku B1 --is-linux

az webapp create --name "benefits-chatbot-$Environment" --resource-group $ResourceGroupName --plan "benefits-chatbot-plan-$Environment" --runtime "NODE|18-lts"

# Deploy Storage Account
Write-Host "💾 Deploying Storage Account..." -ForegroundColor Blue
$storageName = "benefitschatbot$(Get-Random -Maximum 9999)"
az storage account create --name $storageName --resource-group $ResourceGroupName --location $Location --sku Standard_LRS

# Create blob containers
az storage container create --name "documents" --account-name $storageName
az storage container create --name "images" --account-name $storageName

# Deploy Application Insights
Write-Host "📊 Deploying Application Insights..." -ForegroundColor Blue
az monitor app-insights component create --app "benefits-chatbot-insights-$Environment" --location $Location --resource-group $ResourceGroupName --application-type web

# Get connection strings
Write-Host "🔑 Getting connection strings..." -ForegroundColor Blue
$cosmosConnectionString = az cosmosdb keys list --name "benefits-chatbot-cosmos-$Environment" --resource-group $ResourceGroupName --type connection-strings --query connectionStrings[0].connectionString --output tsv
$storageConnectionString = az storage account show-connection-string --name $storageName --resource-group $ResourceGroupName --query connectionString --output tsv
$appInsightsKey = az monitor app-insights component show --app "benefits-chatbot-insights-$Environment" --resource-group $ResourceGroupName --query instrumentationKey --output tsv

# Configure App Service
Write-Host "⚙️ Configuring App Service..." -ForegroundColor Blue
az webapp config appsettings set --name "benefits-chatbot-$Environment" --resource-group $ResourceGroupName --settings `
    NODE_ENV=production `
    AZURE_COSMOS_CONNECTION_STRING=$cosmosConnectionString `
    AZURE_STORAGE_CONNECTION_STRING=$storageConnectionString `
    OPENAI_API_KEY=$OpenAIApiKey `
    AZURE_APPLICATION_INSIGHTS_KEY=$appInsightsKey

# Create environment file
Write-Host "📝 Creating environment file..." -ForegroundColor Blue
$envContent = @"
# Azure Configuration
AZURE_COSMOS_CONNECTION_STRING=$cosmosConnectionString
AZURE_STORAGE_CONNECTION_STRING=$storageConnectionString
OPENAI_API_KEY=$OpenAIApiKey
AZURE_APPLICATION_INSIGHTS_KEY=$appInsightsKey

# App Configuration
NODE_ENV=production
AZURE_ENVIRONMENT=$Environment
RESOURCE_GROUP_NAME=$ResourceGroupName
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8

Write-Host "`n🎉 Quick Azure setup completed!" -ForegroundColor Green
Write-Host "App Service URL: https://benefits-chatbot-$Environment.azurewebsites.net" -ForegroundColor White
Write-Host "Environment file: .env.production" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Deploy your code to the App Service" -ForegroundColor White
Write-Host "2. Test the application" -ForegroundColor White
Write-Host "3. Set up monitoring and alerts" -ForegroundColor White
