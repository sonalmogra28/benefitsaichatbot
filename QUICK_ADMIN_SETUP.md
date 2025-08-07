# Quick Admin Setup Guide

## 1. Sign Up
- Go to http://localhost:3000/handler/signup
- Create account with your email
- Complete the signup process

## 2. Find Your User ID
Run this command:
```bash
pnpm list-users
```

Look for your email in the output and copy the Stack User ID (starts with `user_`)

## 3. Make Yourself Platform Admin
Run this command with your email and the user ID:
```bash
pnpm create-admin your-email@example.com user_XXXXXXXXXXXXX
```

## 4. Access Admin Panel
- Log out and log back in
- Go to http://localhost:3000/super-admin
- You should see the Super Admin Dashboard

## 5. Assign Other Roles (NEW!)
- In Super Admin Dashboard, click "Users" tab
- Click "Assign Roles" button
- You can now change any user's role through the UI

## Troubleshooting
If you get errors:
1. Check that all 3 Stack Auth keys are in .env.local
2. Make sure you restarted the dev server
3. Try clearing browser cookies for localhost
4. Check console for specific error messages