#!/usr/bin/env node

/**
 * Backend Services Test Script
 * Run this to verify all Firebase Functions are working correctly
 */

const https = require('node:https');

// Configuration - Update these after deployment
const PROJECT_ID = 'your-project-id'; // Replace with your Firebase project ID
const REGION = 'us-central1';
const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

// Test configuration
const tests = {
  chatWithAI: {
    name: 'AI Chat Function',
    endpoint: '/chatWithAI',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo-token', // Replace with actual token
    },
    body: {
      message: 'What are the health insurance benefits?',
      chatId: 'test-chat-001',
      companyId: 'demo-company',
    },
  },
  searchDocuments: {
    name: 'Document Search Function',
    endpoint: '/searchDocuments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo-token',
    },
    body: {
      query: 'health insurance deductible',
      companyId: 'demo-company',
    },
  },
  getCompanyStats: {
    name: 'Company Statistics Function',
    endpoint: '/getCompanyStats',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer demo-token',
    },
    body: {
      companyId: 'demo-company',
    },
  },
  setUserRole: {
    name: 'User Role Management Function',
    endpoint: '/setUserRole',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer admin-token', // Requires admin token
    },
    body: {
      userId: 'test-user-001',
      role: 'employee',
      companyId: 'demo-company',
    },
  },
  createCompany: {
    name: 'Company Creation Function',
    endpoint: '/createCompany',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer super-admin-token', // Requires super admin token
    },
    body: {
      name: 'Test Company',
      domain: 'testcompany.com',
      adminEmail: 'admin@testcompany.com',
    },
  },
};

// Test runner
async function runTest(testName, config) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing: ${config.name}`);
    console.log(`   Endpoint: ${config.endpoint}`);

    const options = {
      hostname: `${REGION}-${PROJECT_ID}.cloudfunctions.net`,
      path: config.endpoint,
      method: config.method,
      headers: config.headers,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`   ✅ Success (${res.statusCode})`);
          try {
            const response = JSON.parse(data);
            console.log(
              `   Response:`,
              JSON.stringify(response, null, 2).substring(0, 200),
            );
          } catch (e) {
            console.log(`   Response:`, data.substring(0, 200));
          }
          resolve(true);
        } else {
          console.log(`   ❌ Failed (${res.statusCode})`);
          console.log(`   Error:`, data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Network Error:`, error.message);
      resolve(false);
    });

    if (config.body) {
      req.write(JSON.stringify(config.body));
    }
    req.end();
  });
}

// Local test using fetch (for development)
async function runLocalTest(testName, config) {
  console.log(`\n🧪 Testing Locally: ${config.name}`);
  console.log(
    `   Endpoint: http://localhost:5001/${PROJECT_ID}/${REGION}${config.endpoint}`,
  );

  try {
    const response = await fetch(
      `http://localhost:5001/${PROJECT_ID}/${REGION}${config.endpoint}`,
      {
        method: config.method,
        headers: config.headers,
        body: JSON.stringify(config.body),
      },
    );

    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(
        `   Response:`,
        JSON.stringify(data, null, 2).substring(0, 200),
      );
      return true;
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   Error:`, data);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Firebase Backend Services Test Suite');
  console.log('=====================================');

  const isLocal = process.argv.includes('--local');

  if (isLocal) {
    console.log('📍 Running tests against local emulators');
    console.log('   Make sure emulators are running: firebase emulators:start');
  } else {
    console.log(`📍 Running tests against: ${BASE_URL}`);
    console.log(
      '   Make sure functions are deployed: firebase deploy --only functions',
    );
  }

  const results = [];

  for (const [testName, config] of Object.entries(tests)) {
    const result = isLocal
      ? await runLocalTest(testName, config)
      : await runTest(testName, config);
    results.push({ name: config.name, passed: result });

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log('================');

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      failed++;
    }
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your backend is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Show usage
if (process.argv.includes('--help')) {
  console.log(`
Usage: node test-backend.js [options]

Options:
  --local    Test against local Firebase emulators
  --help     Show this help message

Before running:
1. Update PROJECT_ID in this script
2. For production tests: Deploy functions with 'firebase deploy --only functions'
3. For local tests: Start emulators with 'firebase emulators:start'
  `);
  process.exit(0);
}

// Run tests
main().catch(console.error);
