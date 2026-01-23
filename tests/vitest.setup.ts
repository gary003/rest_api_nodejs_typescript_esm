import logger from '../src/v1/helpers/logger'
import { Wait, DockerComposeEnvironment, PullPolicy, StartedDockerComposeEnvironment } from 'testcontainers'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

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
    API_HOST: 'localhost',
    API_PORT: '8080',
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
      .withBuild()
      .withPullPolicy(PullPolicy.defaultPolicy())
      .withEnvironment(testEnvVariables)
      .withWaitStrategy('db', Wait.forHealthCheck())
      .withWaitStrategy('app', Wait.forHealthCheck())
      .up(['app', 'db'])

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
 * @description Helper to find the db container with fallback names
 * Testcontainers/Docker Compose may name containers differently (e.g., 'db', 'db-1', or with project prefix)
 * @param dockerTestEnv - The started Docker Compose environment
 * @returns The db container or undefined if not found
 **/
const getDbContainer = (dockerTestEnv: StartedDockerComposeEnvironment) => {
  // Try common container name patterns
  const candidateNames = ['db', 'db-1']

  for (const name of candidateNames) {
    try {
      return dockerTestEnv.getContainer(name)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // Container not found with this name, try next
    }
  }

  // Last resort: wildcard search in internal containers map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = dockerTestEnv as any
  const containers = env.containers || {}

  // log in the test machine the docker logs from the db container
  execSync('docker compose ps && docker compose logs db', { stdio: 'inherit' })

  const dbKey = Object.keys(containers).find((key: string) => key.includes('db'))

  return dbKey ? containers[dbKey] : undefined
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
    // We wrap the cleanup in a separate try-catch so that if it fails,
    // we still proceed to stop the environment and process coverage.
    try {
      logger.debug('Cleaning up test users from database ...')
      const dbContainer = getDbContainer(dockerTestEnv)

      if (dbContainer) {
        const dbName = testEnvVariables.DB_DATABASE_NAME
        const rootPassword = testEnvVariables.DB_ROOT_PASSWORD

        await dbContainer.exec([
          'mysql',
          '-u',
          'root',
          `--password=${rootPassword}`,
          '-e',
          `DELETE FROM ${dbName}.wallet WHERE customer_id IN (SELECT customer_id FROM ${dbName}.customer WHERE firstname LIKE 'test%');`
        ])
        await dbContainer.exec(['mysql', '-u', 'root', `--password=${rootPassword}`, '-e', `DELETE FROM ${dbName}.customer WHERE firstname LIKE 'test%';`])
        logger.debug('Database cleanup successful!')
      } else {
        logger.warn('Skipping database cleanup as DB container was not found.')
      }
    } catch (cleanupError) {
      logger.warn(`Database cleanup failed (skipping): ${cleanupError}`)
    }

    // This section MUST always run to free up ports
    try {
      logger.debug('Stopping test environment ...')
      await dockerTestEnv.down()
      logger.debug('Docker Compose test environment stopped!')
    } catch (downError) {
      logger.error(`Failed to bring down Docker Compose environment: ${downError}`)
    }

    // Fix permissions of coverage files (they are owned by root from the container)
    // We use a temporary container to chmod them so the host user can read/modify them
    if (fs.existsSync(path.resolve(process.cwd(), 'coverage/tmp'))) {
      try {
        const coveragePath = path.resolve(process.cwd(), 'coverage/tmp')
        logger.debug(`Fixing permissions for ${coveragePath}...`)
        execSync(`docker run --rm -v "${coveragePath}":/data alpine chmod -R 777 /data`)
      } catch (err) {
        logger.error(`Failed to fix permissions: ${err}`)
      }
    }

    // Fix coverage paths in the generated V8 coverage files from the container
    // We mount ./coverage/tmp to /app/coverage/tmp in docker-compose.yaml
    const coverageDir = path.resolve(process.cwd(), 'coverage/tmp')

    if (fs.existsSync(coverageDir)) {
      logger.debug(`Processing coverage files in ${coverageDir} ...`)
      const files = fs.readdirSync(coverageDir)

      let processedCount = 0
      for (const file of files) {
        if (!file.endsWith('.json')) continue

        const filePath = path.join(coverageDir, file)
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Replace container path '/app/' with local project root path
          // This maps /app/dist/... -> <cwd>/dist/...
          // Since we enabled source maps in tsconfig.json and built locally with 'npm run build:app',
          // c8/vitest should be able to map dist/ files back to src/ files.
          const newContent = content.replaceAll('/app/', process.cwd() + '/')

          // Only write back if changes were made to avoid touching timestamps unnecessarily (though mostly harmless)
          if (content !== newContent) {
            fs.writeFileSync(filePath, newContent)
            processedCount++
          }
        } catch (err) {
          logger.error(`Failed to process coverage file ${file}: ${err}`)
        }
      }
      logger.debug(`Processed ${processedCount} coverage files from container.`)
    }
  } catch (error) {
    logger.error(`Error during Docker Compose teardown: ${error}`)
    throw new Error(`error during Docker Compose teardown: ${error}`) // Fail the tests if teardown fails
  }
}
