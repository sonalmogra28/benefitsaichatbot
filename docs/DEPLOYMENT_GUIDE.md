# Deployment Guide - Benefits Assistant Chatbot

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools
- Node.js 18+ and npm 9+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud SDK (for Vertex AI features)
- Git

### Required Accounts
- Firebase/Google Cloud account with billing enabled
- Resend account for email services
- (Optional) Redis instance for caching
- (Optional) Pinecone account for vector search

### Access Requirements
- Firebase project owner or editor permissions
- Access to environment secrets/variables
- Domain management access (for custom domains)

---

## Environment Setup

### 1. Firebase Project Setup

#### Create Firebase Projects
```bash
# Login to Firebase
firebase login

# Create staging project
firebase projects:create benefits-staging --display-name "Benefits Bot Staging"

# Create production project  
firebase projects:create benefits-production --display-name "Benefits Bot Production"
```

#### Enable Required Services
For each project (staging and production):
1. Go to Firebase Console
2. Enable:
   - Authentication (Email/Password + Google provider)
   - Firestore Database
   - Cloud Storage
   - Cloud Functions (Blaze plan required)

### 2. Environment Configuration

#### Create Environment Files
```bash
# For Staging
cp .env.local.example .env.staging
# Edit .env.staging with staging values

# For Production
cp .env.local.example .env.production
# Edit .env.production with production values
```

#### Required Environment Variables
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI Providers (at least one required)
GOOGLE_GENERATIVE_AI_API_KEY=

# Email Service
RESEND_API_KEY=

# Environment
NEXT_PUBLIC_ENVIRONMENT=staging|production
NODE_ENV=production
```

### 3. Validate Configuration
```bash
# Validate staging environment
npm run validate-env -- --env=staging

# Validate production environment
npm run validate-env -- --env=production
```

---

## Staging Deployment

### 1. Prepare Staging Build
```bash
# Switch to staging environment
cp .env.staging .env.local

# Install dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Test build locally
npm start
```

### 2. Deploy to Firebase Hosting
```bash
# Select staging project
firebase use benefits-staging

# Deploy security rules
firebase deploy --only firestore:rules,storage:rules

# Deploy to hosting
firebase deploy --only hosting

# Deploy functions (if any)
firebase deploy --only functions
```

### 3. Run UAT Tests
```bash
# Set UAT target
export UAT_BASE_URL=https://benefits-staging.web.app

# Run UAT suite
npm run uat-tests
```

### 4. Verify Deployment
- [ ] Access staging URL
- [ ] Check health endpoint: `/api/health?detailed=true`
- [ ] Verify authentication flow
- [ ] Test super admin functionality
- [ ] Test company admin functionality
- [ ] Test employee chat interface
- [ ] Review error logs

---

## Production Deployment

### 1. Pre-Production Checklist
- [ ] All UAT tests passing in staging
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Team notified of deployment window

### 2. Production Build
```bash
# Switch to production environment
cp .env.production .env.local

# Clean install
rm -rf node_modules .next
npm install

# Production build
npm run build

# Validate build
npm run validate-pow
```

### 3. Database Migration
```bash
# Backup existing data (if any)
firebase firestore:export gs://benefits-backup/$(date +%Y%m%d)

# Deploy security rules
firebase use benefits-production
firebase deploy --only firestore:rules,storage:rules
```

### 4. Deploy Application
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting --project benefits-production

# Monitor deployment
firebase hosting:channel:deploy preview --expires 1h
```

### 5. DNS Configuration
For custom domain:
1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Add your domain (e.g., app.benefitsbot.com)
4. Update DNS records as instructed
5. Wait for SSL certificate provisioning

---

## Post-Deployment Checklist

### Immediate Verification (First 30 minutes)
- [ ] Application accessible via production URL
- [ ] Health check passing: `/api/health`
- [ ] Authentication working
- [ ] AI chat responding
- [ ] No critical errors in logs

### Extended Monitoring (First 24 hours)
- [ ] Error rate < 1%
- [ ] Response times < 2s for 95th percentile
- [ ] No memory leaks
- [ ] Database performance stable
- [ ] Email delivery working

### User Acceptance
- [ ] Key stakeholders notified
- [ ] Initial user group granted access
- [ ] Feedback collection process active
- [ ] Support team briefed

---

## Monitoring & Maintenance

### Health Monitoring
```bash
# Check application health
curl https://your-domain.com/api/health?detailed=true

# Check readiness
curl https://your-domain.com/api/ready
```

### Log Monitoring
Access logs through Firebase Console:
1. Go to Firebase Console
2. Navigate to Firestore > `logs` collection
3. Filter by timestamp and severity

### Error Tracking
```javascript
// View error statistics (in your admin panel or script)
const stats = await errorTracker.getErrorStats(24); // Last 24 hours
console.log(stats);
```

### Performance Monitoring
1. Firebase Console > Performance Monitoring
2. Set up custom traces for critical user paths
3. Monitor Core Web Vitals

### Alerts Setup
Configure alerts in Firebase Console:
- High error rate
- Slow response times
- Database quota usage
- Authentication failures

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)
```bash
# List previous versions
firebase hosting:versions:list

# Rollback to previous version
firebase hosting:rollback

# Or deploy specific version
firebase hosting:clone SOURCE_VERSION:TARGET_CHANNEL
```

### Full Rollback (including database)
```bash
# Restore database backup
firebase firestore:import gs://benefits-backup/YYYYMMDD

# Redeploy previous code version
git checkout previous-release-tag
npm install
npm run build
firebase deploy --only hosting
```

### Emergency Procedures
1. **Enable maintenance mode**:
   ```bash
   firebase functions:config:set app.maintenance_mode="true"
   firebase deploy --only functions
   ```

2. **Notify users**: Update status page or send notifications

3. **Investigate root cause**: Check logs and error reports

4. **Fix and test**: Deploy fix to staging first

5. **Deploy fix**: Follow standard deployment process

---

## CI/CD Pipeline (GitHub Actions)

### Setup Automated Deployment
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main # Production
      - staging # Staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        env:
          NODE_ENV: production
          
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: ${{ github.ref == 'refs/heads/main' && 'benefits-production' || 'benefits-staging' }}
```

---

## Security Checklist

### Pre-Deployment
- [ ] Environment variables secured
- [ ] API keys rotated
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented

### Post-Deployment
- [ ] SSL certificate active
- [ ] Security rules tested
- [ ] Penetration testing scheduled
- [ ] Security monitoring active
- [ ] Incident response plan ready

---

## Support & Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Environment Variable Issues**
```bash
# Validate environment
npm run validate-env

# Check Firebase functions config
firebase functions:config:get
```

**Database Permission Errors**
- Review Firestore security rules
- Check user authentication claims
- Verify service account permissions

### Support Contacts
- Technical Lead: [email]
- DevOps Team: [email]
- On-call Engineer: [phone]

### Documentation References
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Project README](../README.md)

---

## Appendix

### Useful Commands
```bash
# View Firebase project info
firebase projects:list

# View hosting sites
firebase hosting:sites:list

# View recent deploys
firebase hosting:versions:list

# Stream logs
firebase functions:log --only yourFunction

# Export Firestore data
firebase firestore:export gs://your-bucket/backup

# Import Firestore data
firebase firestore:import gs://your-bucket/backup
```

### Environment-Specific URLs
- **Development**: http://localhost:3000
- **Staging**: https://benefits-staging.web.app
- **Production**: https://benefitsbot.com

---

Last Updated: January 2025
Version: 1.0.0