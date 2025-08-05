#!/usr/bin/env node
// scripts/validate-pow.js
// Validate that claude.md has been updated with today's date for PoW tracking

const fs = require('node:fs');
const path = require('node:path');

const mdPath = path.resolve(__dirname, '../claude.md');
if (!fs.existsSync(mdPath)) {
  console.error('PoW validation failed: claude.md not found');
  process.exit(1);
}

const content = fs.readFileSync(mdPath, 'utf8');
const match = content.match(/\*\*Last Updated:\*\* (\d{4}-\d{2}-\d{2})/);
if (!match) {
  console.error(
    'PoW validation failed: No **Last Updated** date found in claude.md',
  );
  process.exit(1);
}

const updatedDate = match[1];
const today = new Date().toISOString().slice(0, 10);

if (updatedDate !== today) {
  console.error(
    `PoW validation failed: Last Updated date (${updatedDate}) does not match today's date (${today})`,
  );
  process.exit(1);
}

console.log('PoW validation passed: claude.md is up to date.');
process.exit(0);
