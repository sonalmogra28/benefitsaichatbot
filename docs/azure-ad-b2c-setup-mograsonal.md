# Azure AD B2C Setup Guide for mograsonal10@gmail.com

## Prerequisites ✅
- Azure account: `mograsonal10@gmail.com`
- Permissions: Application Administrator in Entra
- Access to Azure Portal: https://portal.azure.com

## Step 1: Access Azure AD B2C

1. **Go to Azure Portal**: https://portal.azure.com
2. **Sign in with**: `mograsonal10@gmail.com`
3. **Search for**: "Azure AD B2C" or go to https://portal.azure.com/#view/Microsoft_AAD_B2CAdmin/TenantManagementMenuBlade/~/overview

## Step 2: Create or Select B2C Tenant

If you don't have a B2C tenant yet:
1. **Click**: "Create a new B2C tenant"
2. **Fill in**:
   - **Organization name**: `AmeriVet Benefits`
   - **Initial domain name**: `amerivetbenefits` (this will be `amerivetbenefits.onmicrosoft.com`)
   - **Country/Region**: `United States`
3. **Click**: "Create"

If you already have a B2C tenant, select it from the list.

## Step 3: Create App Registration

1. **In your B2C tenant**, go to **App registrations**
2. **Click**: "New registration"
3. **Fill in**:
   - **Name**: `Benefits Assistant Chatbot`
   - **Supported account types**: `Accounts in any identity provider or organizational directory (for authenticating users with user flows)`
   - **Redirect URI**: 
     - **Platform**: `Single-page application (SPA)`
     - **URI**: `http://localhost:3000`
4. **Click**: "Register"

## Step 4: Configure App Registration

### 4.1: Add Redirect URIs
1. **Go to**: "Authentication" in the left menu
2. **Add redirect URIs**:
   - `http://localhost:3000`
   - `https://benefits-chatbot-dev.azurewebsites.net`
   - `https://benefits-chatbot-dev.azurewebsites.net/`
3. **Under "Implicit grant and hybrid flows"**:
   - ✅ Check "Access tokens"
   - ✅ Check "ID tokens"
4. **Click**: "Save"

### 4.2: Create Client Secret
1. **Go to**: "Certificates & secrets" in the left menu
2. **Click**: "New client secret"
3. **Fill in**:
   - **Description**: `Benefits Assistant Secret`
   - **Expires**: `24 months`
4. **Click**: "Add"
5. **Copy the secret value** (you won't see it again!)

### 4.3: Note Application Details
1. **Go to**: "Overview" in the left menu
2. **Copy these values**:
   - **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Step 5: Create User Flows

### 5.1: Sign-up and Sign-in Flow
1. **Go to**: "User flows" in the left menu
2. **Click**: "New user flow"
3. **Select**: "Sign up and sign in"
4. **Fill in**:
   - **Name**: `B2C_1_susi`
   - **User attributes**: Select all relevant attributes
   - **Application claims**: Select all relevant claims
5. **Click**: "Create"

### 5.2: Password Reset Flow
1. **Click**: "New user flow"
2. **Select**: "Password reset"
3. **Fill in**:
   - **Name**: `B2C_1_reset`
4. **Click**: "Create"

### 5.3: Profile Edit Flow
1. **Click**: "New user flow"
2. **Select**: "Profile editing"
3. **Fill in**:
   - **Name**: `B2C_1_editprofile`
4. **Click**: "Create"

## Step 6: Update Environment Variables

Update your `.env.local` file with the B2C details:

```env
# Azure AD B2C Configuration
AZURE_AD_B2C_TENANT_NAME=amerivetbenefits.onmicrosoft.com
AZURE_AD_B2C_CLIENT_ID=your-application-client-id
AZURE_AD_B2C_CLIENT_SECRET=your-client-secret-value
AZURE_AD_B2C_SIGNUP_SIGNIN_POLICY=B2C_1_susi
AZURE_AD_B2C_RESET_PASSWORD_POLICY=B2C_1_reset
AZURE_AD_B2C_EDIT_PROFILE_POLICY=B2C_1_editprofile

# Update MSAL Configuration
NEXT_PUBLIC_AZURE_AD_CLIENT_ID=your-application-client-id
NEXT_PUBLIC_AZURE_AD_TENANT_NAME=amerivetbenefits.onmicrosoft.com
NEXT_PUBLIC_AZURE_AD_SIGNUP_SIGNIN_POLICY=B2C_1_susi
```

## Step 7: Update MSAL Configuration

Update `lib/azure/msal-client.ts` with your actual B2C details:

```typescript
const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || '',
    authority: `https://amerivetbenefits.b2clogin.com/amerivetbenefits.onmicrosoft.com/B2C_1_susi`,
    knownAuthorities: ['amerivetbenefits.b2clogin.com'],
    redirectUri: '/',
    postLogoutRedirectUri: '/',
  },
  // ... rest of config
};
```

## Step 8: Test Authentication

1. **Start the application**: `npm run dev`
2. **Go to**: http://localhost:3000/login
3. **Click**: "Sign in with Microsoft"
4. **Verify**: You can sign up, sign in, and sign out

## Step 9: Create Test Users (Optional)

1. **Go to**: "Users" in the left menu
2. **Click**: "New user"
3. **Fill in**:
   - **User name**: `test@amerivetbenefits.onmicrosoft.com`
   - **Name**: `Test User`
   - **Password**: Create a strong password
4. **Click**: "Create"

## Troubleshooting

### Common Issues:

1. **"AADB2C90077" Error**: Invalid redirect URI
   - **Solution**: Ensure redirect URIs match exactly in App Registration

2. **"AADB2C90091" Error**: User cancelled the flow
   - **Solution**: This is normal user behavior, handle gracefully

3. **"AADB2C90006" Error**: Invalid client ID
   - **Solution**: Check the client ID in environment variables

4. **CORS Issues**: 
   - **Solution**: Ensure all redirect URIs are properly configured

### Testing Checklist:

- [ ] Can access B2C tenant in Azure Portal
- [ ] App registration created successfully
- [ ] Redirect URIs configured correctly
- [ ] Client secret generated and copied
- [ ] User flows created (sign-up/sign-in, password reset, profile edit)
- [ ] Environment variables updated
- [ ] MSAL configuration updated
- [ ] Local authentication works
- [ ] Can create and sign in with test users

## Next Steps

After B2C setup is complete:
1. **Create Azure resources** using the setup scripts
2. **Update environment variables** with Azure connection strings
3. **Test full application** with real Azure services
4. **Deploy to Azure App Service**

## Estimated Time: 30-45 minutes
## Cost: $0 (B2C is free for up to 50,000 MAU)
