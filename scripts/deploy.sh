#!/bin/bash

# Deployment script for Benefits AI Chatbot
# This script handles the complete deployment process
#
# Usage: ./deploy.sh [target]
# Supported targets: firebase, cloud-run, azure
# Default: firebase

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
        "FIREBASE_ADMIN_PROJECT_ID"
        "GOOGLE_CLOUD_PROJECT"
        "VERTEX_AI_PROJECT_ID"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_status "Environment variables check passed"
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        print_error "Neither pnpm nor npm is installed"
        exit 1
    fi
    
    print_status "Dependencies installed successfully"
}

# Run linting and type checking
run_checks() {
    print_status "Running code quality checks..."
    
    # Type checking
    print_status "Running TypeScript type checking..."
    if command -v pnpm &> /dev/null; then
        pnpm typecheck
    else
        npx tsc --noEmit
    fi
    
    # Linting
    print_status "Running linter..."
    if command -v pnpm &> /dev/null; then
        pnpm lint
    else
        npx next lint
    fi
    
    print_status "Code quality checks passed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if command -v pnpm &> /dev/null; then
        pnpm test
    else
        npm test
    fi
    
    print_status "Tests passed"
}

# Build the application
build_app() {
    print_status "Building application..."
    
    if command -v pnpm &> /dev/null; then
        pnpm build
    else
        npm run build
    fi
    
    print_status "Application built successfully"
}

# Deploy to Firebase
deploy_firebase() {
    print_status "Deploying to Firebase..."
    
    # Check if Firebase CLI is installed
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first:"
        print_error "npm install -g firebase-tools"
        exit 1
    fi
    
    # Login to Firebase (if not already logged in)
    firebase login --no-localhost
    
    # Deploy to Firebase
    firebase deploy --only hosting,functions
    
    print_status "Firebase deployment completed"
}

# Deploy to Google Cloud Run (alternative)
deploy_cloud_run() {
    print_status "Deploying to Google Cloud Run..."
    
    # Check if gcloud CLI is installed
    if ! command -v gcloud &> /dev/null; then
        print_error "Google Cloud CLI is not installed. Please install it first:"
        print_error "https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Set project
    gcloud config set project $GOOGLE_CLOUD_PROJECT
    
    # Build and deploy
    gcloud run deploy benefits-chatbot \
        --source . \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --memory 2Gi \
        --cpu 2 \
        --max-instances 10
    
    print_status "Cloud Run deployment completed"
}

# Deploy to Azure
deploy_azure() {
    print_status "Deploying to Azure..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Set variables
    RESOURCE_GROUP=${AZURE_RESOURCE_GROUP:-"benefits-chatbot-rg"}
    LOCATION=${AZURE_LOCATION:-"East US"}
    APP_NAME=${AZURE_APP_NAME:-"benefits-chatbot"}
    
    print_status "Creating resource group: $RESOURCE_GROUP"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    
    print_status "Deploying Azure infrastructure..."
    az deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file azure/main.bicep \
        --parameters environment=prod location="$LOCATION"
    
    print_status "Building and deploying application..."
    npm run build
    
    print_status "Deploying to Azure App Service..."
    az webapp deployment source config-zip \
        --resource-group "$RESOURCE_GROUP" \
        --name "$APP_NAME" \
        --src dist.zip
    
    print_status "Azure deployment completed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # This would run any necessary database migrations
    # For now, we'll just log that migrations would run here
    print_status "Database migrations completed (placeholder)"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait a moment for deployment to be ready
    sleep 10
    
    # Get the deployed URL (this would be dynamic in a real scenario)
    DEPLOYED_URL=${NEXT_PUBLIC_APP_URL:-"https://your-app.web.app"}
    
    # Check if the health endpoint responds
    if curl -f -s "$DEPLOYED_URL/api/health" > /dev/null; then
        print_status "Health check passed - application is running"
    else
        print_warning "Health check failed - application may not be ready yet"
    fi
}

# Main deployment function
main() {
    local deployment_target=${1:-"firebase"}
    
    print_status "Starting deployment to $deployment_target"
    
    check_env
    install_deps
    run_checks
    run_tests
    build_app
    run_migrations
    
    case $deployment_target in
        "firebase")
            deploy_firebase
            ;;
        "cloud-run")
            deploy_cloud_run
            ;;
        "azure")
            deploy_azure
            ;;
        *)
            print_error "Unknown deployment target: $deployment_target"
            print_error "Supported targets: firebase, cloud-run, azure"
            exit 1
            ;;
    esac
    
    health_check
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Your application is now live and ready to use"
}

# Run main function with all arguments
main "$@"
