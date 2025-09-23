# Azure Resource Setup Script
# Run this script after logging into Azure CLI

Write-Host "Setting up Azure resources for Benefits Assistant Chatbot..." -ForegroundColor Green

# Set variables
$resourceGroupName = "benefits-chatbot-rg-dev"
$location = "East US"
$subscriptionId = "your-subscription-id"  # Replace with actual subscription ID

# Set subscription
Write-Host "Setting subscription..." -ForegroundColor Yellow
az account set --subscription $subscriptionId

# Create resource group
Write-Host "Creating resource group..." -ForegroundColor Yellow
az group create --name $resourceGroupName --location $location

# Create Cosmos DB
Write-Host "Creating Cosmos DB..." -ForegroundColor Yellow
az cosmosdb create --name "benefits-chatbot-cosmos-dev" --resource-group $resourceGroupName --locations regionName=$location --kind GlobalDocumentDB --default-consistency-level Session

# Create Storage Account
Write-Host "Creating Storage Account..." -ForegroundColor Yellow
az storage account create --name "benefitschatbotdev" --resource-group $resourceGroupName --location $location --sku Standard_LRS

# Create Redis Cache
Write-Host "Creating Redis Cache..." -ForegroundColor Yellow
az redis create --name "benefits-chatbot-redis-dev" --resource-group $resourceGroupName --location $location --sku Basic --vm-size c0

# Create Application Insights
Write-Host "Creating Application Insights..." -ForegroundColor Yellow
az monitor app-insights component create --app "benefits-chatbot-insights-dev" --location $location --resource-group $resourceGroupName

# Create Key Vault
Write-Host "Creating Key Vault..." -ForegroundColor Yellow
az keyvault create --name "benefits-chatbot-vault-dev" --resource-group $resourceGroupName --location $location

# Create App Service Plan
Write-Host "Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create --name "benefits-chatbot-plan-dev" --resource-group $resourceGroupName --location $location --sku B1 --is-linux

# Create Web App
Write-Host "Creating Web App..." -ForegroundColor Yellow
az webapp create --name "benefits-chatbot-dev" --resource-group $resourceGroupName --plan "benefits-chatbot-plan-dev" --runtime "NODE|18-lts"

Write-Host "Azure resources created successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Get connection strings and keys from Azure Portal" -ForegroundColor White
Write-Host "2. Update .env.local file with actual values" -ForegroundColor White
Write-Host "3. Deploy your application" -ForegroundColor White
