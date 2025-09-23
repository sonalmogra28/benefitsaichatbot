# Azure Setup Script for mograsonal10@gmail.com
# This script creates all necessary Azure resources for the Benefits Assistant Chatbot

# --- Configuration ---
$subscriptionId = ""  # Will be filled after login
$resourceGroupName = "benefits-chatbot-rg-dev"
$location = "East US"
$environment = "dev"

# Resource names (must be globally unique)
$cosmosDbName = "benefits-chatbot-cosmos-dev"
$storageAccountName = "benefitschatbotdev"
$redisName = "benefits-chatbot-redis-dev"
$appInsightsName = "benefits-chatbot-insights-dev"
$keyVaultName = "benefits-chatbot-vault-dev"
$appServicePlanName = "benefits-chatbot-plan-dev"
$webAppName = "benefits-chatbot-dev"

Write-Host "🚀 Starting Azure Resource Creation for Benefits Assistant Chatbot" -ForegroundColor Green
Write-Host "Account: mograsonal10@gmail.com" -ForegroundColor Cyan
Write-Host "Environment: $environment" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Login to Azure ---
Write-Host "Step 1: Logging in to Azure..." -ForegroundColor Yellow
try {
    az login --use-device-code
    Write-Host "✅ Azure login successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure login failed. Please ensure Azure CLI is installed and try again." -ForegroundColor Red
    exit 1
}

# --- Step 2: Get Subscription ID ---
Write-Host "Step 2: Getting subscription information..." -ForegroundColor Yellow
try {
    $subscription = az account show --query "{id:id, name:name}" -o json | ConvertFrom-Json
    $subscriptionId = $subscription.id
    Write-Host "✅ Using subscription: $($subscription.name) ($subscriptionId)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get subscription information" -ForegroundColor Red
    exit 1
}

# --- Step 3: Create Resource Group ---
Write-Host "Step 3: Creating Resource Group..." -ForegroundColor Yellow
try {
    $existingRG = az group show --name $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingRG) {
        az group create --name $resourceGroupName --location $location | Out-Null
        Write-Host "✅ Resource Group '$resourceGroupName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Resource Group '$resourceGroupName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Resource Group" -ForegroundColor Red
    exit 1
}

# --- Step 4: Create Cosmos DB ---
Write-Host "Step 4: Creating Cosmos DB..." -ForegroundColor Yellow
try {
    $existingCosmos = az cosmosdb show --name $cosmosDbName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingCosmos) {
        az cosmosdb create `
            --name $cosmosDbName `
            --resource-group $resourceGroupName `
            --location $location `
            --kind GlobalDocumentDB `
            --default-consistency-level Session `
            --enable-free-tier false `
            --server-version 4.0 `
            --capabilities EnableServerless | Out-Null
        Write-Host "✅ Cosmos DB '$cosmosDbName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Cosmos DB '$cosmosDbName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Cosmos DB" -ForegroundColor Red
}

# --- Step 5: Create Storage Account ---
Write-Host "Step 5: Creating Storage Account..." -ForegroundColor Yellow
try {
    $existingStorage = az storage account show --name $storageAccountName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingStorage) {
        az storage account create `
            --name $storageAccountName `
            --resource-group $resourceGroupName `
            --location $location `
            --sku Standard_LRS `
            --kind StorageV2 `
            --access-tier Hot | Out-Null
        Write-Host "✅ Storage Account '$storageAccountName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Storage Account '$storageAccountName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Storage Account" -ForegroundColor Red
}

# --- Step 6: Create Redis Cache ---
Write-Host "Step 6: Creating Redis Cache..." -ForegroundColor Yellow
try {
    $existingRedis = az redis show --name $redisName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingRedis) {
        az redis create `
            --name $redisName `
            --resource-group $resourceGroupName `
            --location $location `
            --sku Basic `
            --vm-size C0 | Out-Null
        Write-Host "✅ Redis Cache '$redisName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Redis Cache '$redisName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Redis Cache" -ForegroundColor Red
}

# --- Step 7: Create Application Insights ---
Write-Host "Step 7: Creating Application Insights..." -ForegroundColor Yellow
try {
    $existingAppInsights = az monitor app-insights show --name $appInsightsName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingAppInsights) {
        az monitor app-insights create `
            --name $appInsightsName `
            --resource-group $resourceGroupName `
            --location $location `
            --kind web | Out-Null
        Write-Host "✅ Application Insights '$appInsightsName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Application Insights '$appInsightsName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Application Insights" -ForegroundColor Red
}

# --- Step 8: Create Key Vault ---
Write-Host "Step 8: Creating Key Vault..." -ForegroundColor Yellow
try {
    $existingKeyVault = az keyvault show --name $keyVaultName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingKeyVault) {
        az keyvault create `
            --name $keyVaultName `
            --resource-group $resourceGroupName `
            --location $location `
            --sku Standard | Out-Null
        Write-Host "✅ Key Vault '$keyVaultName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Key Vault '$keyVaultName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Key Vault" -ForegroundColor Red
}

# --- Step 9: Create App Service Plan ---
Write-Host "Step 9: Creating App Service Plan..." -ForegroundColor Yellow
try {
    $existingPlan = az appservice plan show --name $appServicePlanName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingPlan) {
        az appservice plan create `
            --name $appServicePlanName `
            --resource-group $resourceGroupName `
            --location $location `
            --sku B1 `
            --is-linux | Out-Null
        Write-Host "✅ App Service Plan '$appServicePlanName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ App Service Plan '$appServicePlanName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create App Service Plan" -ForegroundColor Red
}

# --- Step 10: Create Web App ---
Write-Host "Step 10: Creating Web App..." -ForegroundColor Yellow
try {
    $existingWebApp = az webapp show --name $webAppName --resource-group $resourceGroupName --query name -o tsv 2>$null
    if (-not $existingWebApp) {
        az webapp create `
            --name $webAppName `
            --resource-group $resourceGroupName `
            --plan $appServicePlanName `
            --runtime "NODE:18-lts" | Out-Null
        Write-Host "✅ Web App '$webAppName' created" -ForegroundColor Green
    } else {
        Write-Host "✅ Web App '$webAppName' already exists" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to create Web App" -ForegroundColor Red
}

# --- Step 11: Get Connection Strings and Keys ---
Write-Host "Step 11: Collecting connection information..." -ForegroundColor Yellow

Write-Host ""
Write-Host "🔑 COLLECTING AZURE CONNECTION INFORMATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Cosmos DB
Write-Host "Cosmos DB:" -ForegroundColor Yellow
$cosmosEndpoint = az cosmosdb show --name $cosmosDbName --resource-group $resourceGroupName --query documentEndpoint -o tsv
$cosmosKey = az cosmosdb keys list --name $cosmosDbName --resource-group $resourceGroupName --query primaryMasterKey -o tsv
Write-Host "  Endpoint: $cosmosEndpoint"
Write-Host "  Key: $cosmosKey"

# Storage Account
Write-Host "Storage Account:" -ForegroundColor Yellow
$storageKey = az storage account keys list --name $storageAccountName --resource-group $resourceGroupName --query "[0].value" -o tsv
$storageConnectionString = az storage account show-connection-string --name $storageAccountName --resource-group $resourceGroupName --query connectionString -o tsv
Write-Host "  Connection String: $storageConnectionString"

# Redis Cache
Write-Host "Redis Cache:" -ForegroundColor Yellow
$redisHost = az redis show --name $redisName --resource-group $resourceGroupName --query hostName -o tsv
$redisPort = az redis show --name $redisName --resource-group $resourceGroupName --query port -o tsv
$redisKey = az redis list-keys --name $redisName --resource-group $resourceGroupName --query primaryKey -o tsv
Write-Host "  Host: $redisHost"
Write-Host "  Port: $redisPort"
Write-Host "  Key: $redisKey"

# Application Insights
Write-Host "Application Insights:" -ForegroundColor Yellow
$appInsightsConnectionString = az monitor app-insights show --name $appInsightsName --resource-group $resourceGroupName --query connectionString -o tsv
Write-Host "  Connection String: $appInsightsConnectionString"

# Key Vault
Write-Host "Key Vault:" -ForegroundColor Yellow
$keyVaultUri = az keyvault show --name $keyVaultName --resource-group $resourceGroupName --query properties.vaultUri -o tsv
Write-Host "  URI: $keyVaultUri"

Write-Host ""
Write-Host "✅ Azure resource creation completed!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your .env.local file with the connection strings above" -ForegroundColor White
Write-Host "2. Create Cosmos DB containers using the Azure Portal" -ForegroundColor White
Write-Host "3. Create Storage containers using the Azure Portal" -ForegroundColor White
Write-Host "4. Test the application locally" -ForegroundColor White
Write-Host "5. Deploy to Azure Web App" -ForegroundColor White
