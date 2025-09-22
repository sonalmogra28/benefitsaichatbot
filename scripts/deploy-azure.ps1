# Azure Deployment Script for Benefits Chatbot
# Total Cost: $343-609/month

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "benefits-chatbot-rg-$Environment",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$OpenAIApiKey,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServicePrincipalId
)

Write-Host "🚀 Deploying Benefits Chatbot to Azure..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Location: $Location" -ForegroundColor Yellow
Write-Host "Estimated Monthly Cost: $343-609" -ForegroundColor Cyan

# Create resource group
Write-Host "📦 Creating resource group..." -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Deploy Azure resources
Write-Host "🏗️ Deploying Azure resources..." -ForegroundColor Blue
az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file azure/main.bicep `
    --parameters environment=$Environment location=$Location openaiApiKey=$OpenAIApiKey appServicePrincipalId=$AppServicePrincipalId `
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
    
    Write-Host "`n🎉 Benefits Chatbot is ready for production!" -ForegroundColor Green
} else {
    Write-Host "❌ Azure deployment failed!" -ForegroundColor Red
    exit 1
}
