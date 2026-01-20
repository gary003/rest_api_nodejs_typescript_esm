#!/bin/bash
set -e

# Lint the code
npm run lint

# Clean previous builds and coverage
npm run clean
rm -rf coverage/tmp
mkdir -p coverage/tmp

# Run all tests (Integration, Performance, Unit) with V8 coverage enabled
export NODE_V8_COVERAGE=coverage/tmp
npx vitest run './tests/integration' './tests/performance' './tests/unit/v1'

# Generate coverage report
npx c8 report --temp-directory coverage/tmp -r text -r lcov
