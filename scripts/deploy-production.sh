#!/bin/bash

echo "🚀 Production Deployment Script"
echo "==============================="

# Build functions
echo "📦 Building Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase deploy --only functions,hosting,firestore:rules,firestore:indexes

echo "✅ Deployment complete!"
echo ""
echo "Production URLs:"
echo "- App: https://benefitschatbotac-383.web.app"
echo "- Functions: https://us-central1-benefitschatbotac-383.cloudfunctions.net"
echo ""
echo "Next steps:"
echo "1. Test login at production URL"
echo "2. Monitor functions: firebase functions:log"
echo "3. Check analytics in Firebase Console"