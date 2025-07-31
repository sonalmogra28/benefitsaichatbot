#!/bin/bash

# Deployment Verification Script
# Run this after deployment to check if auth is working

echo "🔍 Stack Auth Deployment Verification"
echo "====================================="
echo ""

# Get the deployment URL from Vercel
echo "📋 Recent Deployments:"
echo "Check your Vercel dashboard for the latest deployment URL"
echo ""

echo "✅ Verification Steps:"
echo ""
echo "1. Visit the deployment URL"
echo "2. Go to /debug/auth to check Stack Auth status"
echo "3. Try to sign in at /login"
echo "4. Check browser console for errors"
echo "5. If sign-in works, test /admin/documents"
echo ""

echo "🔧 If authentication still fails:"
echo ""
echo "1. Verify these environment variables are set on Vercel:"
echo "   - NEXT_PUBLIC_STACK_PROJECT_ID"
echo "   - NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY"
echo "   - STACK_SECRET_SERVER_KEY"
echo ""
echo "2. Check that Stack Auth project URLs match your deployment domain"
echo "3. Look for any error messages in the browser console"
echo ""

echo "📊 Expected Results:"
echo ""
echo "✅ /debug/auth should show Stack Auth configuration"
echo "✅ /login should load without redirect loops"
echo "✅ Sign-in should create a session"
echo "✅ /admin/documents should be accessible after sign-in"
echo ""

echo "Report any issues with specific error messages!"