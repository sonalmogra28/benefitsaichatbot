#!/bin/bash
# CI Validation Script
set -e

echo "Running CI validation pipeline..."

# Lint
echo "Running linter..."
pnpm lint

# Tests
echo "Running tests..."
pnpm test

# PoW validation
echo "Running PoW validation..."
pnpm validate-pow

echo "CI validation complete!"
