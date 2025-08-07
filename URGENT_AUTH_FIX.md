# URGENT: Authentication Fix - Step by Step

## Current Problem
- Stack Auth keys are invalid
- Can't sign in as admin
- No UI to assign roles

## Step 1: Fix Stack Auth Connection

### 1.1 Get New Stack Auth Keys
1. Go to https://app.stack-auth.com/
2. Sign in or create account
3. Create a new project or use existing
4. Copy the three keys

### 1.2 Update .env.local
```
NEXT_PUBLIC_STACK_PROJECT_ID=[your-project-id]
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=[your-publishable-key]
STACK_SECRET_SERVER_KEY=[your-secret-key]
```

### 1.3 Test Connection
```bash
pnpm dev
```
Go to http://localhost:3000/login - you should see the login page without errors

## Step 2: Create Your First Admin User

### 2.1 Sign Up
1. Go to http://localhost:3000/handler/signup
2. Create an account with your email
3. Complete sign up

### 2.2 Find Your User ID
```bash
pnpm list-users
```
Copy your Stack User ID from the output

### 2.3 Make Yourself Platform Admin
```bash
pnpm create-admin your-email@example.com [your-stack-user-id]
```

### 2.4 Test Admin Access
1. Log out and log back in
2. Go to http://localhost:3000/super-admin
3. You should see the super admin dashboard

## Step 3: Quick Role Assignment UI

Since we need this working NOW, here's the fastest solution: