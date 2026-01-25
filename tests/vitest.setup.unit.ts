import { logger } from '../src/v1/helpers/logger/index.js'

/**
 * @description
 * This file serves as the Vitest global setup for Unit Tests.
 * Unlike integration tests, unit tests are designed to run in isolation
 * and do not require Docker containers or external databases.
 */

/**
 * @description Mock environment variables for unit tests.
 * This ensures that tests don't accidentally try to connect to real services.
 */
const unitTestEnv = {
  NODE_ENV: 'test',
  APP_HOST: 'localhost',
  APP_PORT: '3000',
  API_HOST: 'localhost',
  API_PORT: '3000',
  DB_HOST: 'localhost',
  DB_DRIVER: 'sqlite',
  DB_USERNAME: 'test_user',
  DB_PASSWORD: 'test_password',
  DB_DATABASE_NAME: ':memory:', // Use in-memory DB for unit tests if needed
  DB_PORT: '0',
  LOGLEVEL: 'info',
  JWT_SECRET: 'test_secret_key'
}

/**
 * @description
 * Vitest global setup function for unit tests.
 * This is called once before any test files are executed.
 */
export async function setup(): Promise<void> {
  logger.info('🚀 Starting Unit Test Suite (Docker-free environment)')

  // Apply environment variables to the process
  Object.entries(unitTestEnv).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  })

  logger.info('✅ Unit test environment variables initialized.')
}

/**
 * @description
 * Vitest global teardown function for unit tests.
 * This is called once after all test files have finished executing.
 */
export async function teardown(): Promise<void> {
  logger.info('🧹 Unit Test Suite Teardown complete.')
}
