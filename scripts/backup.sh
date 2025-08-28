#!/bin/bash

# Simple backup script for Firestore data
# Run daily via cron or GitHub Actions

PROJECT_ID="benefitschatbotac-383"
BACKUP_BUCKET="gs://benefitschatbotac-383-backups"
DATE=$(date +%Y%m%d-%H%M%S)

echo "Starting backup for $PROJECT_ID at $DATE"

# Export Firestore data
gcloud firestore export $BACKUP_BUCKET/backups/$DATE \
  --project=$PROJECT_ID \
  --async

echo "Backup initiated to $BACKUP_BUCKET/backups/$DATE"

# Clean up old backups (keep last 7 days)
gsutil ls $BACKUP_BUCKET/backups/ | head -n -7 | xargs -I {} gsutil -m rm -r {}

echo "Backup complete"