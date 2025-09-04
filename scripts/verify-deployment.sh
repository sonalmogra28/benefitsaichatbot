#!/bin/bash

# Deployment Verification Script
# Run this after deployment to Firebase Hosting to check if auth is working

set -euo pipefail

echo "🔍 Stack Auth Deployment Verification"
echo "====================================="
echo ""

# Show Firebase Hosting sites if possible
echo "📋 Firebase Hosting Sites:"
if command -v firebase >/dev/null 2>&1; then
  firebase hosting:sites:list 2>/dev/null || echo "Unable to list sites – ensure you're logged in with 'firebase login'."
else
  echo "Firebase CLI not installed. Install with 'npm install -g firebase-tools'."
fi
echo ""

echo "✅ Verification Steps:"
echo ""
echo "1. Visit your Firebase Hosting URL"
echo "2. Go to /debug/auth to check Stack Auth status"
echo "3. Try to sign in at /login"
echo "4. Check browser console for errors"
echo "5. If sign-in works, test /admin/documents"
echo ""

echo "🔧 If authentication still fails:"
echo ""
echo "1. Verify these environment variables are configured in Firebase Hosting:"
echo "   - NEXT_PUBLIC_STACK_PROJECT_ID"
echo "   - NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY"
echo "   - STACK_SECRET_SERVER_KEY"
echo ""
echo "2. Ensure your Firebase Hosting domain matches Stack Auth project URLs"
echo "3. Review Firebase Hosting logs and browser console for errors"
echo ""

echo "📊 Expected Results:"
echo ""
echo "✅ /debug/auth should show Stack Auth configuration"
echo "✅ /login should load without redirect loops"
echo "✅ Sign-in should create a session"
echo "✅ /admin/documents should be accessible after sign-in"
echo ""

echo "Report any issues with specific error messages!"
