import logger from '../src/v1/helpers/logger'
import { Wait, DockerComposeEnvironment, PullPolicy, StartedDockerComposeEnvironment } from 'testcontainers'

/** 
 * @description Path to the docker-compose file
 * @type {string}
**/ 
const composeFilePath: string = '.'
/** 
 * @description Name of the docker-compose file
 * @type {string}
**/ 
const composeFile: string = 'docker-compose.yaml'

/** 
 * @description In a real project, you would use a .env file for environment variables
 * @type {Object}
**/ 
export const getDockerTestEnvVariables = (): Record<string, string> => {
  return {
    APP_HOST: 'localhost',
    APP_PORT: '8080',
    DB_HOST: 'db',
    DB_DRIVER: 'mysql',
    DB_USERNAME: 'mysql',
    DB_PASSWORD: 'mypass',
    DB_ROOT_PASSWORD: 'StrongRootPassword123!',
    DB_DATABASE_NAME: 'mydb',
    DB_PORT: '3306',
    LOGLEVEL: 'debug'
  }
}

/** 
 * @description Global variable to store the test environment
 * @type {StartedDockerComposeEnvironment | null}
**/ 
let globalDockerTestEnv: StartedDockerComposeEnvironment | null = null

/** 
 * @description Vitest global setup function (only launches the dockerized test environment once)
 * @returns {Promise<void>}
**/ 
export const setup = async (): Promise<void> => {
  logger.debug('Starting Vitest Global Setup - Initializing Docker Compose (with testcontainers) ...')
  
  const testEnvVariables = getDockerTestEnvVariables()

  logger.debug(`testEnvVariables: ${JSON.stringify(testEnvVariables, null, 2)}`)
  logger.debug(`getTestUrls(): ${JSON.stringify(getTestUrls(), null, 2)}`)
  
  try {
    globalDockerTestEnv = await new DockerComposeEnvironment(composeFilePath, composeFile)
      .withPullPolicy(PullPolicy.defaultPolicy())
      .withEnvironment(testEnvVariables)
      .withWaitStrategy('db-1', Wait.forHealthCheck())
      .withWaitStrategy('app-1', Wait.forHttp('/api/v1/health', 8080))
      .up(['app','db'])
    
    logger.debug('Docker Compose test environment is ready!')
  } catch (error) {
    logger.error(`Failed to start Docker Compose environment: ${error}`)
    throw new Error(`error during Docker Compose setup: ${error}`)
  }
}

/** 
 * @description 
 * Get test URLs
 * Those urls are built from the test environment variables to fetch the according services in the isolated dockerized test environment.
 * @returns {Record<string, string>} - Object containing test URLs to fetch the testing environment
**/ 
export const getTestUrls = (testEnvVariables = getDockerTestEnvVariables()): Record<string, string> => {
  return {
    appUrl: `http://${testEnvVariables.APP_HOST}:${testEnvVariables.APP_PORT}`,
    dbUriTest: `${testEnvVariables.DB_DRIVER}://${testEnvVariables.DB_USERNAME}:${testEnvVariables.DB_PASSWORD}@localhost:${testEnvVariables.DB_PORT}/${testEnvVariables.DB_DATABASE_NAME}`
  }
}

/**
 * @description Vitest global teardown function
 * @returns {Promise<void>}
**/ 
export const teardown = async (): Promise<void> => {
  const dockerTestEnv = globalDockerTestEnv
  if (!dockerTestEnv) return

  const testEnvVariables = getDockerTestEnvVariables()
  logger.debug('Starting Vitest Global Teardown - Stopping Docker Compose ...')
  try {
    logger.debug('Cleaning up test users from database ...')
    const dbContainer = dockerTestEnv.getContainer('db-1')
    const dbName = testEnvVariables.DB_DATABASE_NAME
    const rootPassword = testEnvVariables.DB_ROOT_PASSWORD

    // Delete users created during tests (convention: firstname starts with 'test')
    // We also delete associated wallets first due to foreign key constraints
    // We use separate exec calls to ensure each statement is executed correctly
    await dbContainer.exec([
      'mysql', 
      '-u', 'root', 
      `--password=${rootPassword}`, 
      '-e', `DELETE FROM ${dbName}.wallet WHERE customer_id IN (SELECT customer_id FROM ${dbName}.customer WHERE firstname LIKE 'test%');`
    ])
    await dbContainer.exec([
      'mysql', 
      '-u', 'root', 
      `--password=${rootPassword}`, 
      '-e', `DELETE FROM ${dbName}.customer WHERE firstname LIKE 'test%';`
    ])
    logger.debug('Cleanup successful!')
    logger.debug('Stopping test environment ...')
    await dockerTestEnv.down()
    logger.debug('Docker Compose test environment stopped!')
  } catch (error) {
    logger.error(`Error during Docker Compose teardown: ${error}`)
    throw new Error(`error during Docker Compose teardown: ${error}`) // Fail the tests if teardown fails
  }
}
