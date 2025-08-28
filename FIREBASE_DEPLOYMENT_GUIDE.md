# 🚀 Firebase Deployment & Testing Guide

## ✅ Current Status
- **Functions**: Built and ready to deploy
- **Security Rules**: Configured with role-based access control
- **Indexes**: Optimized for all query patterns
- **API Keys**: Active and configured in environment

## 📋 Pre-Deployment Checklist

### 1. Verify Environment Variables
```bash
# Check .env.local has all required keys
cat .env.local | grep -E "FIREBASE|GOOGLE_GENERATIVE_AI"
```

Required variables:
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY`
- ✅ `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- ✅ `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- ✅ `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `NEXT_PUBLIC_FIREBASE_APP_ID`
- ✅ `GOOGLE_GENERATIVE_AI_API_KEY`

### 2. Build Functions
```bash
cd functions
npm install
npm run build
```

### 3. Test Functions Locally
```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, run the app
npm run dev
```

## 🚀 Deployment Commands

### Deploy Everything
```bash
# Deploy all Firebase services
firebase deploy
```

### Deploy Individual Services
```bash
# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:chatWithAI

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage
```

## 🧪 Testing Checklist

### Backend Services Testing

#### 1. User Management Functions
- [ ] Test user creation trigger
- [ ] Test welcome chat creation
- [ ] Test role assignment
- [ ] Test user profile updates

```javascript
// Test in browser console at http://localhost:3001/demo-access.html
// 1. Click "ACCESS AS EMPLOYEE"
// 2. Check console for session creation
// 3. Verify redirect to chat interface
```

#### 2. Document Processing
- [ ] Upload a PDF document
- [ ] Upload a text document
- [ ] Verify chunking process
- [ ] Check document storage in Firestore

```bash
# Monitor function logs
firebase functions:log --only processUploadedDocument
```

#### 3. AI Chat Functions
- [ ] Send chat message as employee
- [ ] Verify Gemini AI response
- [ ] Test document search integration
- [ ] Check chat history persistence

```javascript
// Test chat API
const testChat = async () => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What are my health insurance benefits?',
      chatId: 'test-chat-001',
      companyId: 'acme-corp'
    })
  });
  const data = await response.json();
  console.log('AI Response:', data);
};
```

#### 4. Search Functions
- [ ] Test keyword search
- [ ] Test relevance scoring
- [ ] Verify company-scoped results
- [ ] Check search performance

#### 5. Admin Functions
- [ ] Create new company (super admin)
- [ ] Set user roles (admin)
- [ ] View company statistics
- [ ] Access audit logs

### Frontend Testing

#### 1. Authentication Flow
- [ ] Demo employee access works
- [ ] Demo admin access works
- [ ] Session persistence across pages
- [ ] Logout functionality

#### 2. UI Components
- [ ] Chat interface loads
- [ ] Messages display correctly
- [ ] Admin dashboard renders
- [ ] Navigation works

#### 3. Real-time Features
- [ ] Chat updates in real-time
- [ ] Document upload progress
- [ ] Status notifications

## 📊 Monitoring & Logs

### View Function Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only chatWithAI

# Last 50 entries
firebase functions:log --lines 50
```

### Monitor in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to:
   - **Functions**: View executions, errors, performance
   - **Firestore**: Monitor database usage
   - **Storage**: Check file uploads
   - **Authentication**: View user accounts

## 🔒 Security Verification

### Test Security Rules
```bash
# Run security rules tests
npm run test:rules
```

### Verify Role-Based Access
1. **Employee Role**: Can only access own data
2. **HR Admin**: Can manage company employees
3. **Company Admin**: Full company management
4. **Platform Admin**: Cross-company access
5. **Super Admin**: Full system access

## 🎯 Quick Access URLs

### Local Development
- **Demo Access Portal**: http://localhost:3001/demo-access.html
- **Employee Chat**: http://localhost:3001/instant-demo
- **Admin Dashboard**: http://localhost:3001/instant-admin
- **Super Admin**: http://localhost:3001/super-admin

### Production URLs (after deployment)
- Main App: https://your-project.web.app
- API Endpoint: https://us-central1-your-project.cloudfunctions.net

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Functions Not Deploying
```bash
# Check Node version (must be 18+)
node --version

# Clear cache and rebuild
cd functions
rm -rf node_modules lib
npm install
npm run build
```

#### 2. Authentication Errors
```bash
# Re-login to Firebase
firebase logout
firebase login
```

#### 3. Gemini AI Not Working
- Verify API key in environment
- Check quota limits in Google Cloud Console
- Test with curl:
```bash
curl -X POST https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

#### 4. Firestore Permission Denied
- Check security rules deployment
- Verify user roles in custom claims
- Test with Firebase emulator first

## 📈 Performance Optimization

### Function Cold Starts
- Keep functions warm with minimum instances:
```javascript
// In functions/src/index.ts
setGlobalOptions({ 
  minInstances: 1, // Keep 1 instance warm
  maxInstances: 10
});
```

### Database Queries
- Use composite indexes for complex queries
- Limit result sets with `.limit()`
- Implement pagination for large datasets

## ✅ Post-Deployment Verification

1. [ ] All functions deployed successfully
2. [ ] Security rules active
3. [ ] Indexes created
4. [ ] Demo access working
5. [ ] Chat functionality operational
6. [ ] Admin dashboard accessible
7. [ ] Document upload functional
8. [ ] Search returning results
9. [ ] Analytics tracking events
10. [ ] Error logging active

## 📝 Next Steps

1. **Set up monitoring alerts** in Google Cloud Console
2. **Configure backup strategy** for Firestore
3. **Implement rate limiting** for API endpoints
4. **Add custom domain** for production
5. **Enable Firebase App Check** for additional security

## 🔑 Important Notes

- **API Keys**: Your Gemini API key is embedded in functions. For production, use Secret Manager
- **Demo Mode**: Current setup uses demo authentication. Configure Firebase Auth for production
- **Scaling**: Monitor usage and adjust function instances as needed
- **Costs**: Keep an eye on Firestore reads/writes and function invocations

---

## 🎉 Your Backend is Ready!

All Firebase Functions are implemented and ready to deploy. Use the demo access page to test:

```
http://localhost:3001/demo-access.html
```

Deploy to production when ready:
```bash
firebase deploy
```