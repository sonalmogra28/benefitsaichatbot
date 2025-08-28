#!/bin/bash

# Build and Deploy Script for Benefits Chatbot

echo "🚀 Starting deployment process..."

# 1. Build the Next.js app locally
echo "📦 Building Next.js application..."
export NODE_OPTIONS="--max-old-space-size=6144"
pnpm build

if [ $? -ne 0 ]; then
  echo "❌ Build failed. Please fix errors and try again."
  exit 1
fi

echo "✅ Build successful!"

# 2. Create a production-ready build
echo "📋 Creating production bundle..."

# 3. Deploy to Firebase Hosting (static files)
echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo ""
echo "📌 Your app is available at:"
echo "   https://benefitschatbotac-383.web.app"
echo ""
echo "⚠️  Note: This is a static deployment. For full functionality with API routes,"
echo "   you need to deploy to Cloud Run or use Firebase Functions."
echo ""
echo "To access the demo:"
echo "   1. Go to: https://benefitschatbotac-383.web.app/demo"
echo "   2. This will set up a demo session with super admin access"