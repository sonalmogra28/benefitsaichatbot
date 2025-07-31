# Vercel Environment Variables Checklist

## Required Stack Auth Variables

These MUST be set in your Vercel project settings at:
https://vercel.com/[your-team]/benefitschatbot/settings/environment-variables

### 1. Stack Auth Variables (REQUIRED)
```
NEXT_PUBLIC_STACK_PROJECT_ID=1f39c103-a9ed-4bb9-a258-f9d5823e3c82
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_hvbjs2tm1y8myshkt6k03m3y64rjt11zpznnt3jmeab70
STACK_SECRET_SERVER_KEY=ssk_c2fy0wpxqz0zzcdr464kxdwp5cq570sbve1mwj092tcwr
```

### 2. Database Variables (REQUIRED)
```
DATABASE_URL=[Your PostgreSQL connection string]
POSTGRES_URL=[Your PostgreSQL connection string]
```

### 3. OpenAI API (REQUIRED)
```
OPENAI_API_KEY=[Your OpenAI API key]
```

### 4. Pinecone (REQUIRED for document search)
```
PINECONE_API_KEY=[Your Pinecone API key]
PINECONE_INDEX_NAME=benefits-ai
```

### 5. Other Required Variables
```
AUTH_SECRET=[Random secret for session encryption]
```

## How to Add Variables in Vercel

1. Go to your project settings
2. Click on "Environment Variables"
3. Add each variable with its value
4. Select which environments to apply to (Production, Preview, Development)
5. Click "Save"

## Verification Steps

1. After adding all variables, trigger a new deployment
2. Check the build logs for any missing variable warnings
3. Visit the deployment and check:
   - Can you see the login page?
   - Can you click "Sign In" without errors?
   - Check browser console for any API errors

## Common Issues

1. **Missing NEXT_PUBLIC_ variables**: These must be prefixed with NEXT_PUBLIC_ to be available in the browser
2. **Incorrect variable names**: Double-check spelling and casing
3. **Not saving after adding**: Make sure to click "Save" after adding each variable
4. **Wrong environment**: Ensure variables are set for the correct environment (Production)