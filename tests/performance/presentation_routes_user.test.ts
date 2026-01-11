import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DockerComposeEnvironment, PullPolicy, StartedDockerComposeEnvironment, Wait } from 'testcontainers'

import { exec } from 'child_process'
import { promisify } from 'util'
import { userWalletDTO } from '../../src/v1/services/user/dto'

const execAsync = promisify(exec)

type outputType = {
  totalRequests: number
  successfulResponses: number
  non2xxResponses: number
  avgLatency: number
}

/**
 * Parse autocannon output to extract performance metrics
 */
const parseAutocannonOutput = (output: string): outputType => {
  try {
    // Try to find the JSON part of the output (in case there's other text)
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in output')
    
    const results = JSON.parse(jsonMatch[0])
    return {
      totalRequests: results.requests.total,
      successfulResponses: results['2xx'],
      non2xxResponses: results.non2xx,
      avgLatency: results.latency.average
    }
  } catch (e) {
    console.error('Failed to parse autocannon JSON output:', e)
    // Fallback to a safe object if parsing fails
    throw new Error(`Invalid output format - ${e}`)
  }
}

describe('Performance tests - presentation:routes:user', () => {
  const timeoutTest = 120000

  // Dont accidentally fetch the real database (use the containerized test environment) !
  process.env.DB_URI = ''
  process.env.DB_HOST = ''

  // This variable will store the test environment from the docker-compose
  let dockerComposeEnvironment: StartedDockerComposeEnvironment

  const originalEnv = { ...process.env }

  // This is a portfolio API, in a real project, use a .env !
  const test_env = {
    DB_DRIVER: 'mysql',
    DB_USERNAME: 'mysql',
    DB_PASSWORD: 'mypass',
    DB_DATABASE_NAME: 'mydb',
    DB_PORT: '3306',
    DOCKER_APP_NETWORK: 'my_app_network',
    API_PORT: '8081',
    LOGLEVEL: 'debug',
    NODE_ENV: 'performance'
  }

  process.env = { ...process.env, ...test_env }

  // Those variables will be used to fetch data from the containerized app (need to be global to be used in the tests)
  let appUrl: string = ''
  let allUsers: userWalletDTO[] = []

  beforeAll(async () => {
    // Path & file name of the docker-compose.yaml to use for the test environment (testcontainer library)
    const composeFilePath: string = '.'
    const composeFile: string = 'docker-compose.yaml'

    // Here we use the testcontainers library to start the containerized, isolated, test environment (with the docker-compose.yaml)
    try {
      dockerComposeEnvironment = await new DockerComposeEnvironment(composeFilePath, composeFile)
        .withPullPolicy(PullPolicy.defaultPolicy())
        .withEnvironment(test_env)
        .withWaitStrategy('app-1', Wait.forLogMessage('app running'))
        .withWaitStrategy('db-1', Wait.forLogMessage('ready for connections'))
        .up(['app'])
    } catch (error) {
      expect.fail(`Container test environment setup failed: ${String(error)}`)
    }

    // This app url will be used to fetch data (in the containerized test environment)
    const appContainer = dockerComposeEnvironment.getContainer('app-1')
    const appPort = Number(process.env.API_PORT)
    appUrl = `http://${appContainer.getHost()}:${appContainer.getMappedPort(appPort)}/api/v1/user`

    // This db url will be used to set the database env variables (to use the db in the containerized test environment)
    const dbContainer = dockerComposeEnvironment.getContainer('db-1')
    const dbPort = Number(process.env.DB_PORT) || 3306
    const dbUriTest = `${process.env.DB_DRIVER}://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${dbContainer.getHost()}:${dbContainer.getMappedPort(dbPort)}/${process.env.DB_DATABASE_NAME}`

    // Important, set the DB env variables to use the db in the containerized test environment
    process.env.DB_URI = dbUriTest
    process.env.DB_PORT = String(dbContainer.getMappedPort(dbPort))

    try {
      const response = await fetch(appUrl)
      const resJson = await response.json()
      allUsers = resJson.data
    } catch (error) {
      expect.fail(`Error - Impossible to get the data stream from route - ${String(error)}`)
    }

    expect(allUsers).to.be.an('array')
    expect(allUsers).to.have.lengthOf.at.least(2)
    
  }, 300000)

  afterAll(async () => {
    if (dockerComposeEnvironment) await dockerComposeEnvironment.down()

    // Cancel the modification of the env variable
    process.env = originalEnv
    // logger.info("Docker Compose test environment stopped for integration tests on user/.")
  }, timeoutTest)

  describe('routes > user > /user GET', () => {
    it('Should maintain stable memory usage under load', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m GET "${appUrl}"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(3000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/:userId GET', () => {
    it('Should maintain stable memory usage under load', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m GET "${appUrl}/${allUsers[0].userId}"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr
      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(3000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/ POST', () => {
    it('Should maintain stable memory usage under load', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m POST --body '{"firstname": "Test", "lastname": "User"}' -H 'Content-Type: application/json' "${appUrl}"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(3000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/transfer', () => {
    it('Should successfully handle query locks validity under heavy load', async () => {
      const user1 = allUsers.at(0)
      const user2 = allUsers.at(1)

      // Use -a 100 to limit total requests and avoid draining the wallet
      const cmd = `npx autocannon -c 6 -a 100 -j -m POST --body '{"senderId": "${user1?.userId}", "receiverId": "${user2?.userId}", "amount": 1, "currency": "hardCurrency"}' -H 'Content-Type: application/json' "${appUrl}/transfer"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0, 'Should have at least some successful transfers')
        expect(metrics.non2xxResponses).to.equal(0, `Should have no failed requests (found ${metrics.non2xxResponses})`)
        expect(metrics.avgLatency).to.be.below(3000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

})