#!/bin/bash
set -e

# Clean previous builds and coverage
npm run clean
rm -rf coverage/tmp
mkdir -p coverage/tmp

# Run integration tests with V8 coverage enabled
export NODE_V8_COVERAGE=coverage/tmp
npx vitest run './tests/integration'

# Generate coverage report
npx c8 report --temp-directory coverage/tmp -r text -r lcov
