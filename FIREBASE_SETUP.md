# 🔥 Firebase Setup Guide for Benefits Assistant Chatbot

## Prerequisites
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Google account

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name it: `benefits-assistant-[yourname]`
4. Enable Google Analytics (optional)
5. Wait for project creation

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable these sign-in providers:
   - **Email/Password**
     - Click "Email/Password"
     - Enable "Email/Password"
     - Enable "Email link (passwordless sign-in)" (optional)
   - **Google** (optional)
     - Click "Google"
     - Enable it
     - Set your project public name
     - Add your email as project support email

## Step 3: Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose "Start in production mode"
4. Select location closest to you (e.g., `us-central1`)
5. Click "Enable"

## Step 4: Enable Cloud Storage

1. Go to **Storage**
2. Click "Get started"
3. Choose "Start in production mode"
4. Select same location as Firestore
5. Click "Done"

## Step 5: Get Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click "Web" icon (`</>`)
4. Register app with nickname: `benefits-web`
5. Copy the configuration:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Step 6: Update Environment Variables

Update your `.env.local` file:

```bash
# Firebase Configuration (from Step 5)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# AI Configuration (keep existing)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key
```

## Step 7: Create Initial Users (Optional)

### Option A: Using Firebase Console
1. Go to **Authentication** > **Users**
2. Click "Add user"
3. Enter email and password
4. Click "Add user"

### Option B: Using the Script
```bash
# First, get service account credentials
# Go to Project Settings > Service Accounts
# Click "Generate new private key"
# Save the JSON file

# Set environment variable
export FIREBASE_SERVICE_ACCOUNT='paste-json-content-here'

# Run the script
npm run create-test-users
```

## Step 8: Set Security Rules

### Firestore Rules
Go to **Firestore** > **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         request.auth.token.role in ['super_admin', 'platform_admin']);
    }
    
    // Company documents
    match /companies/{companyId} {
      allow read: if request.auth != null && 
        (request.auth.token.companyId == companyId ||
         request.auth.token.role in ['super_admin', 'platform_admin']);
      allow write: if request.auth != null &&
        request.auth.token.role in ['super_admin', 'platform_admin', 'company_admin'];
    }
    
    // Chats - users can only access their own
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    // Public documents for RAG
    match /document_chunks/{chunkId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        request.auth.token.role in ['super_admin', 'platform_admin', 'company_admin'];
    }
  }
}
```

### Storage Rules
Go to **Storage** > **Rules** and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Company documents
    match /companies/{companyId}/documents/{document} {
      allow read: if request.auth != null && 
        (request.auth.token.companyId == companyId ||
         request.auth.token.role in ['super_admin', 'platform_admin']);
      allow write: if request.auth != null &&
        request.auth.token.role in ['super_admin', 'platform_admin', 'company_admin', 'hr_admin'];
    }
    
    // User uploads
    match /users/{userId}/{document} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
  }
}
```

## Step 9: Test the Application

1. Restart your development server:
```bash
npm run dev
```

2. Try logging in with:
   - A user you created in Firebase Console
   - OR use demo credentials (will work as fallback)

## Step 10: Deploy to Firebase Hosting (Optional)

```bash
# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Select:
# - Hosting
# - Use existing project
# - Public directory: out
# - Single-page app: Yes
# - Don't overwrite index.html

# Build and deploy
npm run build
firebase deploy
```

## Troubleshooting

### "invalid-credential" Error
- Your Firebase project doesn't have users yet
- The app will fall back to demo mode automatically
- Create users in Firebase Console or use the test user script

### "invalid-api-key" Error
- Check your Firebase configuration in `.env.local`
- Make sure all NEXT_PUBLIC_FIREBASE_* variables are set correctly

### Users Can't Access Features
- Users need custom claims for roles
- Use Firebase Admin SDK to set custom claims
- Or use the provided scripts to create users with roles

## Demo Mode

If Firebase is not configured or users don't exist, the app automatically falls back to demo mode with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@acme.com | TestPass123! |
| HR Admin | hradmin@acme.com | TestPass123! |
| Company Admin | companyadmin@acme.com | TestPass123! |
| Platform Admin | platformadmin@test.com | TestPass123! |
| Super Admin | superadmin@test.com | TestPass123! |

## Production Checklist

- [ ] Firebase project created
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Storage bucket configured
- [ ] Security rules applied
- [ ] Environment variables set
- [ ] Initial users created
- [ ] Custom claims configured
- [ ] Email templates customized
- [ ] Domain verification (for email)
- [ ] Billing enabled (for production use)

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review browser console for errors
3. Verify environment variables
4. Test with demo mode first
5. Check Firebase quota limits

---

**Last Updated**: January 2025
**Version**: 1.0.0