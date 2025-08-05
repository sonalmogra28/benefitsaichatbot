#!/bin/bash

# Benefits Assistant Chatbot - Production Setup Script
# This script helps set up the production environment

set -e

echo "🚀 Benefits Assistant Chatbot - Production Setup"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists. Please back it up before continuing."
    echo "   Run: cp .env.local .env.local.backup"
    exit 1
fi

# Copy example env file
echo "📋 Creating .env.local from .env.example..."
cp .env.example .env.local

echo ""
echo "📝 Please update the following environment variables in .env.local:"
echo ""
echo "1. Database Configuration:"
echo "   - POSTGRES_URL: Your Neon PostgreSQL connection string"
echo "   - DATABASE_URL: Same as POSTGRES_URL"
echo ""
echo "2. Stack Auth:"
echo "   - STACK_PROJECT_ID: From your Stack Auth dashboard"
echo "   - STACK_PUBLISHABLE_CLIENT_KEY: From Stack Auth"
echo "   - STACK_SECRET_SERVER_KEY: From Stack Auth (keep secret!)"
echo ""
echo "3. OpenAI:"
echo "   - OPENAI_API_KEY: Your OpenAI API key"
echo ""
echo "4. Pinecone:"
echo "   - PINECONE_API_KEY: Your Pinecone API key"
echo "   - PINECONE_INDEX_NAME: Create index named 'benefits-ai'"
echo ""
echo "5. Vercel Blob (if using file uploads):"
echo "   - BLOB_READ_WRITE_TOKEN: From Vercel dashboard"
echo ""

# Database setup
echo ""
echo "🗄️  Database Setup"
echo "=================="
echo ""
echo "Run the following commands after updating .env.local:"
echo ""
echo "1. Generate database migrations:"
echo "   npm run db:generate"
echo ""
echo "2. Push schema to database:"
echo "   npm run db:push"
echo ""
echo "3. (Optional) Open Drizzle Studio to view data:"
echo "   npm run db:studio"
echo ""

# Pinecone setup
echo "🔍 Pinecone Setup"
echo "=================="
echo ""
echo "1. Go to https://app.pinecone.io"
echo "2. Create a new index with:"
echo "   - Name: benefits-ai"
echo "   - Dimensions: 1536"
echo "   - Metric: cosine"
echo "   - Pod Type: p1.x1 (or your preference)"
echo ""

# Build check
echo "🏗️  Build Check"
echo "==============="
echo ""
echo "Run these commands to verify everything works:"
echo ""
echo "1. Install dependencies:"
echo "   npm install"
echo ""
echo "2. Run type checking:"
echo "   npm run type-check"
echo ""
echo "3. Build the application:"
echo "   npm run build"
echo ""
echo "4. Start in production mode:"
echo "   npm run start"
echo ""

# Deployment
echo "🚀 Deployment"
echo "============="
echo ""
echo "For Vercel deployment:"
echo ""
echo "1. Push your code to GitHub"
echo "2. Import project in Vercel"
echo "3. Add all environment variables from .env.local"
echo "4. Deploy!"
echo ""
echo "Important Vercel settings:"
echo "- Framework Preset: Next.js"
echo "- Build Command: npm run build"
echo "- Output Directory: .next"
echo "- Install Command: npm install"
echo ""

# Cron jobs
echo "⏰ Cron Jobs Setup"
echo "=================="
echo ""
echo "Add this to vercel.json for document processing:"
echo ""
echo '{'
echo '  "crons": ['
echo '    {'
echo '      "path": "/api/cron/process-documents",'
echo '      "schedule": "*/15 * * * *"'
echo '    }'
echo '  ]'
echo '}'
echo ""

# Security checklist
echo "🔒 Security Checklist"
echo "====================="
echo ""
echo "[ ] All API keys are in environment variables (never in code)"
echo "[ ] CRON_SECRET is set for cron job authentication"
echo "[ ] Rate limiting is configured appropriately"
echo "[ ] CORS settings are restrictive"
echo "[ ] Database has Row Level Security (RLS) enabled"
echo "[ ] Blob storage has proper access controls"
echo ""

# Monitoring
echo "📊 Monitoring Setup (Optional)"
echo "=============================="
echo ""
echo "1. Sentry (Error Tracking):"
echo "   - Create project at https://sentry.io"
echo "   - Add SENTRY_DSN to environment"
echo ""
echo "2. PostHog (Analytics):"
echo "   - Sign up at https://posthog.com"
echo "   - Add POSTHOG_API_KEY to environment"
echo ""

echo ""
echo "✅ Setup script complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your credentials"
echo "2. Run database migrations"
echo "3. Create Pinecone index"
echo "4. Test locally with 'npm run dev'"
echo "5. Deploy to Vercel"
echo ""
echo "Need help? Check the docs in /docs folder"
echo ""