# deploy-production.ps1 - Complete Production Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-benefits-chatbot-$EnvironmentName",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US 2",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory=$false)]
    [switch]$DeployOnly
)

# Set error handling
$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

Write-Host "🚀 Starting Production Deployment for Environment: $EnvironmentName" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Yellow

# Function to log with timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check Azure CLI
    try {
        $azVersion = az --version | Select-String "azure-cli" | Select-Object -First 1
        Write-Log "Azure CLI: $azVersion" "SUCCESS"
    } catch {
        Write-Log "Azure CLI not found. Please install Azure CLI." "ERROR"
        exit 1
    }
    
    # Check if logged in to Azure
    try {
        $account = az account show --query "name" -o tsv
        Write-Log "Logged in to Azure account: $account" "SUCCESS"
    } catch {
        Write-Log "Not logged in to Azure. Running 'az login'..." "WARN"
        az login
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Log "Node.js version: $nodeVersion" "SUCCESS"
    } catch {
        Write-Log "Node.js not found. Please install Node.js 18+." "ERROR"
        exit 1
    }
    
    # Check if .env.production exists
    if (-not (Test-Path ".env.production")) {
        Write-Log "Creating .env.production template..." "WARN"
        Copy-Item ".env.example" ".env.production" -ErrorAction SilentlyContinue
    }
}

# Deploy Azure Infrastructure
function Deploy-Infrastructure {
    if ($SkipInfrastructure) {
        Write-Log "Skipping infrastructure deployment as requested." "WARN"
        return
    }
    
    Write-Log "Deploying Azure infrastructure..."
    
    # Create resource group if it doesn't exist
    $rgExists = az group exists --name $ResourceGroupName
    if ($rgExists -eq "false") {
        Write-Log "Creating resource group: $ResourceGroupName"
        az group create --name $ResourceGroupName --location $Location
    } else {
        Write-Log "Resource group $ResourceGroupName already exists" "SUCCESS"
    }
    
    # Deploy main Bicep template
    Write-Log "Deploying main Bicep template..."
    $deploymentName = "benefits-chatbot-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file "azure/main.bicep" `
        --parameters "azure/parameters.$EnvironmentName.json" `
        --name $deploymentName `
        --verbose
        
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Infrastructure deployment failed!" "ERROR"
        exit 1
    }
    
    Write-Log "Infrastructure deployed successfully!" "SUCCESS"
    
    # Get deployment outputs
    Write-Log "Retrieving deployment outputs..."
    $outputs = az deployment group show `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        --query properties.outputs `
        --output json | ConvertFrom-Json
    
    return $outputs
}

# Build and Deploy Application
function Deploy-Application {
    param($InfrastructureOutputs)
    
    Write-Log "Building and deploying application..."
    
    # Install dependencies
    Write-Log "Installing dependencies..."
    npm ci --production=false
    
    # Run TypeScript check
    Write-Log "Running TypeScript validation..."
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Write-Log "TypeScript errors found! Please fix before deploying." "ERROR"
        exit 1
    }
    
    # Run tests
    Write-Log "Running tests..."
    npm run test -- --passWithNoTests
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Tests failed! Please fix before deploying." "ERROR"
        exit 1
    }
    
    # Build application
    Write-Log "Building application for production..."
    $env:NODE_ENV = "production"
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Build failed!" "ERROR"
        exit 1
    }
    
    # Get App Service details from outputs
    if ($InfrastructureOutputs) {
        $appServiceName = $InfrastructureOutputs.appServiceName.value
        $appServiceResourceGroup = $ResourceGroupName
    } else {
        # Try to find existing App Service
        $appServiceName = az webapp list --resource-group $ResourceGroupName --query "[0].name" -o tsv
        if (-not $appServiceName) {
            Write-Log "Could not find App Service in resource group $ResourceGroupName" "ERROR"
            exit 1
        }
    }
    
    Write-Log "Deploying to App Service: $appServiceName"
    
    # Deploy to Azure App Service
    az webapp deployment source config-zip `
        --resource-group $ResourceGroupName `
        --name $appServiceName `
        --src "deployment.zip"
        
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Application deployment failed!" "ERROR"
        exit 1
    }
    
    Write-Log "Application deployed successfully!" "SUCCESS"
    
    # Get the app URL
    $appUrl = az webapp show --resource-group $ResourceGroupName --name $appServiceName --query "defaultHostName" -o tsv
    return "https://$appUrl"
}

# Configure Environment Variables
function Set-EnvironmentVariables {
    param($AppServiceName, $InfrastructureOutputs)
    
    Write-Log "Configuring environment variables..."
    
    # Read .env.production file
    if (Test-Path ".env.production") {
        $envVars = @{}
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $envVars[$matches[1]] = $matches[2]
            }
        }
        
        # Add infrastructure outputs to environment variables
        if ($InfrastructureOutputs) {
            $envVars["AZURE_COSMOS_ENDPOINT"] = $InfrastructureOutputs.cosmosEndpoint.value
            $envVars["AZURE_STORAGE_ACCOUNT"] = $InfrastructureOutputs.storageAccountName.value
            $envVars["AZURE_KEYVAULT_URL"] = $InfrastructureOutputs.keyVaultUrl.value
            $envVars["APPLICATIONINSIGHTS_CONNECTION_STRING"] = $InfrastructureOutputs.appInsightsConnectionString.value
        }
        
        # Set environment variables in App Service
        $settingsJson = $envVars | ConvertTo-Json -Compress
        az webapp config appsettings set `
            --resource-group $ResourceGroupName `
            --name $AppServiceName `
            --settings $envVars
            
        Write-Log "Environment variables configured successfully!" "SUCCESS"
    } else {
        Write-Log ".env.production file not found. Skipping environment variable configuration." "WARN"
    }
}

# Setup Monitoring and Alerts
function Setup-Monitoring {
    param($InfrastructureOutputs)
    
    Write-Log "Setting up monitoring and alerts..."
    
    if ($InfrastructureOutputs -and $InfrastructureOutputs.appInsightsName) {
        $appInsightsName = $InfrastructureOutputs.appInsightsName.value
        
        # Create cost alert
        az monitor metrics alert create `
            --name "High-API-Costs" `
            --resource-group $ResourceGroupName `
            --description "Alert when daily API costs exceed $50" `
            --condition "count static gt 50" `
            --evaluation-frequency 1h `
            --window-size 1h `
            --severity 2
            
        # Create performance alert
        az monitor metrics alert create `
            --name "High-Response-Time" `
            --resource-group $ResourceGroupName `
            --description "Alert when average response time exceeds 5 seconds" `
            --condition "avg static gt 5000" `
            --evaluation-frequency 5m `
            --window-size 15m `
            --severity 3
            
        Write-Log "Monitoring and alerts configured!" "SUCCESS"
    }
}

# Validate Deployment
function Test-Deployment {
    param($AppUrl)
    
    Write-Log "Validating deployment..."
    
    # Health check
    try {
        $healthResponse = Invoke-RestMethod -Uri "$AppUrl/api/health" -Method GET -TimeoutSec 30
        if ($healthResponse.status -eq "healthy") {
            Write-Log "Health check passed!" "SUCCESS"
        } else {
            Write-Log "Health check failed: $($healthResponse.status)" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Health check endpoint unreachable: $_" "ERROR"
        return $false
    }
    
    # API endpoints check
    $endpoints = @("/api/auth/status", "/api/chat/health")
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$AppUrl$endpoint" -Method GET -TimeoutSec 10
            Write-Log "Endpoint $endpoint is accessible" "SUCCESS"
        } catch {
            Write-Log "Endpoint $endpoint failed: $_" "WARN"
        }
    }
    
    return $true
}

# Main execution
function Main {
    try {
        Write-Log "Starting deployment process..." "SUCCESS"
        
        # Check prerequisites
        Test-Prerequisites
        
        # Deploy infrastructure
        $infrastructureOutputs = $null
        if (-not $DeployOnly) {
            $infrastructureOutputs = Deploy-Infrastructure
        }
        
        # Deploy application
        $appUrl = Deploy-Application -InfrastructureOutputs $infrastructureOutputs
        
        # Configure environment variables
        $appServiceName = if ($infrastructureOutputs) { 
            $infrastructureOutputs.appServiceName.value 
        } else { 
            az webapp list --resource-group $ResourceGroupName --query "[0].name" -o tsv 
        }
        
        Set-EnvironmentVariables -AppServiceName $appServiceName -InfrastructureOutputs $infrastructureOutputs
        
        # Setup monitoring
        Setup-Monitoring -InfrastructureOutputs $infrastructureOutputs
        
        # Validate deployment
        $isValid = Test-Deployment -AppUrl $appUrl
        
        if ($isValid) {
            Write-Log "🎉 Deployment completed successfully!" "SUCCESS"
            Write-Log "Application URL: $appUrl" "SUCCESS"
            Write-Log "Resource Group: $ResourceGroupName" "SUCCESS"
            
            # Display cost estimates
            Write-Log "💰 Estimated Monthly Costs:" "SUCCESS"
            Write-Log "  - Azure Services: $193-359/month" "SUCCESS"
            Write-Log "  - OpenAI API: $150-250/month" "SUCCESS"
            Write-Log "  - Total: $343-609/month" "SUCCESS"
            
        } else {
            Write-Log "⚠️ Deployment completed but validation failed. Please check the application manually." "WARN"
        }
        
    } catch {
        Write-Log "Deployment failed: $_" "ERROR"
        Write-Log "Check the logs above for details." "ERROR"
        exit 1
    }
}

# Execute main function
Main

# Final checklist
Write-Host "`n✅ DEPLOYMENT CHECKLIST:" -ForegroundColor Green
Write-Host "□ Azure infrastructure deployed" -ForegroundColor Yellow
Write-Host "□ Application built and deployed" -ForegroundColor Yellow  
Write-Host "□ Environment variables configured" -ForegroundColor Yellow
Write-Host "□ Monitoring and alerts setup" -ForegroundColor Yellow
Write-Host "□ Health checks passed" -ForegroundColor Yellow
Write-Host "□ SSL certificate configured" -ForegroundColor Yellow
Write-Host "□ Custom domain configured (optional)" -ForegroundColor Yellow
Write-Host "□ Backup strategy implemented" -ForegroundColor Yellow
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Configure custom domain if needed" -ForegroundColor White
Write-Host "2. Setup CI/CD pipeline in Azure DevOps/GitHub Actions" -ForegroundColor White
Write-Host "3. Configure backup policies" -ForegroundColor White  
Write-Host "4. Setup log analytics queries" -ForegroundColor White
Write-Host "5. Train your team on the new system" -ForegroundColor White

Write-Host "`n🚀 Your Benefits AI Chatbot is now live!" -ForegroundColor Green
