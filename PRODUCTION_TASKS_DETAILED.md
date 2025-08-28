# Production Tasks - Detailed Implementation Guide

## Immediate Actions ✅ COMPLETED
1. ✅ Removed @vercel/blob from package.json
2. ✅ Deleted /lib/storage/blob.ts
3. ✅ Created /lib/storage/firebase-storage.ts
4. ✅ Updated import statements in upload routes
5. ✅ Removed redis from package.json
6. ✅ Deleted /lib/rate-limit/redis.ts
7. ✅ Created /lib/rate-limit/firestore-limiter.ts
8. ✅ Updated rate limiter initialization

---

## Phase 1: Clean Up Legacy Code

### Task 1.1: Environment Variable Cleanup
**Files to modify:**
- `.env.local`
- `.env.local.example`
- `/lib/config/env.ts`
- `/scripts/validate-env.ts`

**Actions:**
```bash
# Remove from .env files:
REDIS_URL=...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=...
PINECONE_INDEX=...
```

**Deliverables:**
- Clean environment configuration
- Updated validation script

### Task 1.2: Remove Unused Dependencies
**Files to modify:**
- `package.json`

**Check and remove if unused:**
```json
// Potential removals after audit:
"@opentelemetry/api"
"@opentelemetry/api-logs"
"resumable-stream"
"prosemirror-*" (if not using editor)
```

**Commands:**
```bash
npm uninstall @opentelemetry/api @opentelemetry/api-logs
npm audit fix
npm dedupe
```

### Task 1.3: Update Health Check
**Files to modify:**
- `/app/api/health/route.ts`

**Remove Redis health check (lines 57-61, 148-182)**
```typescript
// Remove Redis check section
// Keep only Firebase Auth, Firestore, and AI services checks
```

---

## Phase 2: Firebase/Google Cloud Optimization

### Task 2.1: Firebase Extensions Setup
**Actions via Firebase Console:**
```bash
firebase ext:install firebase/firestore-send-email --project=benefitschatbotac-383
firebase ext:install firebase/storage-resize-images --project=benefitschatbotac-383
firebase ext:install firebase/delete-user-data --project=benefitschatbotac-383
```

**Configuration files:**
- Create `/extensions/firestore-send-email.env`
- Create `/extensions/storage-resize-images.env`

### Task 2.2: Enhanced Security Rules
**Files to create/modify:**
- `firestore.rules`
- `storage.rules`

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Company data isolation
    match /companies/{companyId}/{document=**} {
      allow read: if request.auth != null && 
        (request.auth.token.companyId == companyId ||
         request.auth.token.role == 'super-admin');
      allow write: if request.auth != null &&
        (request.auth.token.role == 'company-admin' ||
         request.auth.token.role == 'super-admin');
    }
    
    // Rate limiting collection
    match /rate_limits/{document=**} {
      allow read, write: if false; // Server-only access
    }
  }
}
```

### Task 2.3: Cloud Functions for Background Jobs
**Files to create:**
- `/functions/src/scheduled/cleanupRateLimits.ts`
- `/functions/src/triggers/processDocument.ts`
- `/functions/src/scheduled/generateAnalytics.ts`

**Example Cloud Function:**
```typescript
// functions/src/scheduled/cleanupRateLimits.ts
import * as functions from 'firebase-functions';
import { FirestoreRateLimiter } from '../lib/rate-limit';

export const cleanupRateLimits = functions
  .pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const limiter = new FirestoreRateLimiter();
    await limiter.cleanupExpired();
  });
```

### Task 2.4: Vertex AI Integration
**Files to create/modify:**
- `/lib/ai/vertex-client.ts`
- `/lib/ai/document-ai.ts`
- `/lib/ai/vector-search.ts`

**Vertex AI Client:**
```typescript
// /lib/ai/vertex-client.ts
import { VertexAI } from '@google-cloud/aiplatform';

export const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: 'us-central1',
});

export const geminiModel = vertexAI.preview.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
});
```

---

## Phase 3: Production Infrastructure

### Task 3.1: Create Dockerfile
**File to create:** `/Dockerfile`
```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
ENV PORT 8080
CMD ["node", "server.js"]
```

### Task 3.2: Cloud Build Configuration
**File to create:** `/cloudbuild.yaml`
```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/benefitschatbot:$COMMIT_SHA', '.']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/benefitschatbot:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'benefitschatbot'
      - '--image=gcr.io/$PROJECT_ID/benefitschatbot:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--max-instances=100'

images:
  - 'gcr.io/$PROJECT_ID/benefitschatbot:$COMMIT_SHA'
```

### Task 3.3: Monitoring Setup
**Files to create:**
- `/lib/monitoring/index.ts`
- `/lib/monitoring/metrics.ts`
- `/lib/monitoring/tracing.ts`

**Cloud Monitoring Integration:**
```typescript
// /lib/monitoring/metrics.ts
import { CloudMonitoring } from '@google-cloud/monitoring';

const monitoring = new CloudMonitoring.MetricServiceClient();

export async function recordMetric(
  name: string,
  value: number,
  labels?: Record<string, string>
) {
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000,
      },
    },
    value: {
      doubleValue: value,
    },
  };
  
  const timeSeriesRequest = {
    name: monitoring.projectPath(process.env.GOOGLE_CLOUD_PROJECT),
    timeSeries: [{
      metric: {
        type: `custom.googleapis.com/benefitschat/${name}`,
        labels,
      },
      points: [dataPoint],
    }],
  };
  
  await monitoring.createTimeSeries(timeSeriesRequest);
}
```

---

## Phase 4: Data & Analytics

### Task 4.1: BigQuery Setup
**Files to create:**
- `/lib/analytics/bigquery.ts`
- `/scripts/setup-bigquery.ts`

**BigQuery Schema:**
```sql
-- scripts/bigquery-schema.sql
CREATE DATASET IF NOT EXISTS benefitschat_analytics;

CREATE TABLE IF NOT EXISTS benefitschat_analytics.chat_sessions (
  session_id STRING NOT NULL,
  user_id STRING NOT NULL,
  company_id STRING NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  message_count INT64,
  ai_provider STRING,
  total_tokens INT64,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS benefitschat_analytics.user_events (
  event_id STRING NOT NULL,
  user_id STRING,
  event_type STRING NOT NULL,
  event_data JSON,
  timestamp TIMESTAMP NOT NULL
);
```

### Task 4.2: Firestore Backup Configuration
**File to create:** `/scripts/backup-firestore.sh`
```bash
#!/bin/bash
PROJECT_ID="benefitschatbotac-383"
BUCKET_NAME="gs://benefitschat-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

gcloud firestore export \
  --project=$PROJECT_ID \
  gs://$BUCKET_NAME/firestore_backup_$TIMESTAMP
```

**Schedule via Cloud Scheduler:**
```bash
gcloud scheduler jobs create http firestore-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/PROJECT_ID/databases/(default)/exportDocuments" \
  --http-method=POST \
  --oauth-service-account-email=SERVICE_ACCOUNT_EMAIL
```

---

## Phase 5: Security & Compliance

### Task 5.1: Service Account Configuration
**Files to create:**
- `/terraform/service-accounts.tf`
- `/scripts/setup-iam.sh`

**IAM Setup Script:**
```bash
#!/bin/bash
# scripts/setup-iam.sh

# Create service accounts
gcloud iam service-accounts create cloud-run-sa \
  --display-name="Cloud Run Service Account"

gcloud iam service-accounts create functions-sa \
  --display-name="Cloud Functions Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### Task 5.2: Secret Manager Integration
**Files to modify:**
- `/lib/config/secrets.ts`

```typescript
// /lib/config/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
  });
  
  return version.payload?.data?.toString() || '';
}

// Usage:
// const apiKey = await getSecret('openai-api-key');
```

### Task 5.3: Cloud Armor Configuration
**File to create:** `/terraform/cloud-armor.tf`
```hcl
resource "google_compute_security_policy" "policy" {
  name = "benefitschat-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["9.9.9.0/24"]
      }
    }
  }

  rule {
    action   = "rate_based_ban"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
  }
}
```

---

## Phase 6: Testing & Validation

### Task 6.1: Unit Tests
**Files to create/modify:**
- `/tests/unit/firebase-storage.test.ts`
- `/tests/unit/firestore-limiter.test.ts`
- `/tests/unit/vertex-ai.test.ts`

**Example Test:**
```typescript
// tests/unit/firebase-storage.test.ts
import { describe, it, expect, vi } from 'vitest';
import { uploadDocument } from '@/lib/storage/firebase-storage';

describe('Firebase Storage', () => {
  it('should upload document successfully', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const result = await uploadDocument(mockFile, 'company123');
    
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('fileId');
    expect(result.originalName).toBe('test.pdf');
  });
});
```

### Task 6.2: Load Testing
**File to create:** `/tests/load/k6-script.js`
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get('https://benefitschatbot.web.app/api/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Task 6.3: E2E Tests
**Files to create:**
- `/tests/e2e/auth-flow.spec.ts`
- `/tests/e2e/chat-flow.spec.ts`
- `/tests/e2e/admin-flow.spec.ts`

---

## Phase 7: Launch Preparation

### Task 7.1: Documentation
**Files to create:**
- `/docs/API.md`
- `/docs/DEPLOYMENT.md`
- `/docs/TROUBLESHOOTING.md`
- `/docs/ADMIN_GUIDE.md`

### Task 7.2: Runbooks
**Files to create:**
- `/runbooks/incident-response.md`
- `/runbooks/rollback-procedure.md`
- `/runbooks/scaling-guide.md`

### Task 7.3: Migration Scripts
**Files to create:**
- `/scripts/migrate-users.ts`
- `/scripts/migrate-data.ts`
- `/scripts/rollback.sh`

---

## Phase 8: Production Launch

### Task 8.1: Pre-Launch Checklist
**File to create:** `/checklists/launch.md`

### Task 8.2: Deployment Script
**File to create:** `/scripts/deploy-production.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Run tests
npm test
npm run test:e2e

# Build application
npm run build

# Deploy to Firebase
firebase deploy --only hosting,functions,firestore,storage

# Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml

# Run smoke tests
npm run test:smoke

echo "✅ Deployment complete!"
```

### Task 8.3: Monitoring Dashboard
**Files to create:**
- `/monitoring/dashboard.json`
- `/monitoring/alerts.yaml`

---

## Success Criteria

### Technical Metrics
- [ ] All tests passing (>80% coverage)
- [ ] No critical vulnerabilities
- [ ] Response time p95 < 200ms
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%

### Deployment Checklist
- [ ] Firebase project configured
- [ ] Cloud Run service deployed
- [ ] BigQuery datasets created
- [ ] Monitoring dashboards active
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] SSL certificates valid
- [ ] Domain configured

### Security Checklist
- [ ] Service accounts configured with minimal permissions
- [ ] Secrets in Secret Manager
- [ ] Cloud Armor rules active
- [ ] Firestore rules tested
- [ ] Storage rules tested
- [ ] App Check enabled
- [ ] Binary Authorization configured

---

## Next Steps

1. **Today**: Complete environment cleanup
2. **Tomorrow**: Set up Firebase Extensions
3. **This Week**: Deploy to Cloud Run staging
4. **Next Week**: Complete security hardening

## Support Resources

- Firebase Documentation: https://firebase.google.com/docs
- Cloud Run Documentation: https://cloud.google.com/run/docs
- Vertex AI Documentation: https://cloud.google.com/vertex-ai/docs
- Support Email: team@benefitschat.com
- On-Call: [Schedule Link]