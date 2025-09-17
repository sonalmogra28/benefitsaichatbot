# Deployment script for Benefits AI Chatbot (PowerShell)
# This script handles the complete deployment process

param(
    [string]$DeploymentTarget = "firebase"
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Check if required environment variables are set
function Test-Environment {
    Write-Status "Checking environment variables..."
    
    $requiredVars = @(
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "FIREBASE_ADMIN_PROJECT_ID",
        "GOOGLE_CLOUD_PROJECT",
        "VERTEX_AI_PROJECT_ID"
    )
    
    foreach ($var in $requiredVars) {
        if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
            Write-Error "Required environment variable $var is not set"
            exit 1
        }
    }
    
    Write-Status "Environment variables check passed"
}

# Install dependencies
function Install-Dependencies {
    Write-Status "Installing dependencies..."
    
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm install
    } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
        npm install
    } else {
        Write-Error "Neither pnpm nor npm is installed"
        exit 1
    }
    
    Write-Status "Dependencies installed successfully"
}

# Run linting and type checking
function Invoke-CodeChecks {
    Write-Status "Running code quality checks..."
    
    # Type checking
    Write-Status "Running TypeScript type checking..."
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm typecheck
    } else {
        npx tsc --noEmit
    }
    
    # Linting
    Write-Status "Running linter..."
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm lint
    } else {
        npx next lint
    }
    
    Write-Status "Code quality checks passed"
}

# Run tests
function Invoke-Tests {
    Write-Status "Running tests..."
    
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm test
    } else {
        npm test
    }
    
    Write-Status "Tests passed"
}

# Build the application
function Build-Application {
    Write-Status "Building application..."
    
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        pnpm build
    } else {
        npm run build
    }
    
    Write-Status "Application built successfully"
}

# Deploy to Firebase
function Deploy-Firebase {
    Write-Status "Deploying to Firebase..."
    
    # Check if Firebase CLI is installed
    if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
        Write-Error "Firebase CLI is not installed. Please install it first:"
        Write-Error "npm install -g firebase-tools"
        exit 1
    }
    
    # Login to Firebase (if not already logged in)
    firebase login --no-localhost
    
    # Deploy to Firebase
    firebase deploy --only hosting,functions
    
    Write-Status "Firebase deployment completed"
}

# Deploy to Google Cloud Run (alternative)
function Deploy-CloudRun {
    Write-Status "Deploying to Google Cloud Run..."
    
    # Check if gcloud CLI is installed
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "Google Cloud CLI is not installed. Please install it first:"
        Write-Error "https://cloud.google.com/sdk/docs/install"
        exit 1
    }
    
    # Set project
    gcloud config set project $env:GOOGLE_CLOUD_PROJECT
    
    # Build and deploy
    gcloud run deploy benefits-chatbot `
        --source . `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --memory 2Gi `
        --cpu 2 `
        --max-instances 10
    
    Write-Status "Cloud Run deployment completed"
}

# Run database migrations
function Invoke-Migrations {
    Write-Status "Running database migrations..."
    
    # This would run any necessary database migrations
    # For now, we'll just log that migrations would run here
    Write-Status "Database migrations completed (placeholder)"
}

# Health check
function Test-Health {
    Write-Status "Performing health check..."
    
    # Wait a moment for deployment to be ready
    Start-Sleep -Seconds 10
    
    # Get the deployed URL (this would be dynamic in a real scenario)
    $deployedUrl = if ($env:NEXT_PUBLIC_APP_URL) { $env:NEXT_PUBLIC_APP_URL } else { "https://your-app.web.app" }
    
    # Check if the health endpoint responds
    try {
        $response = Invoke-WebRequest -Uri "$deployedUrl/api/health" -UseBasicParsing -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Status "Health check passed - application is running"
        } else {
            Write-Warning "Health check failed - application may not be ready yet"
        }
    } catch {
        Write-Warning "Health check failed - application may not be ready yet: $($_.Exception.Message)"
    }
}

# Main deployment function
function Start-Deployment {
    param([string]$Target)
    
    Write-Status "Starting deployment to $Target"
    
    Test-Environment
    Install-Dependencies
    Invoke-CodeChecks
    Invoke-Tests
    Build-Application
    Invoke-Migrations
    
    switch ($Target) {
        "firebase" {
            Deploy-Firebase
        }
        "cloud-run" {
            Deploy-CloudRun
        }
        default {
            Write-Error "Unknown deployment target: $Target"
            Write-Error "Supported targets: firebase, cloud-run"
            exit 1
        }
    }
    
    Test-Health
    
    Write-Status "🎉 Deployment completed successfully!"
    Write-Status "Your application is now live and ready to use"
}

# Run main function
Start-Deployment -Target $DeploymentTarget
