import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DockerComposeEnvironment, PullPolicy, StartedDockerComposeEnvironment, Wait } from 'testcontainers'

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    DB_DATABASE_NAME: 'mydbuser',
    DB_PORT: '3306',
    DOCKER_APP_NETWORK: 'my_app_network',
    API_PORT: '8080',
    LOGLEVEL: 'debug'
  }

  process.env = { ...process.env, ...test_env }

  let appUrl: string = ''

  beforeAll(async () => {
    const composeFilePath: string = '.'
    const composeFile: string = 'docker-compose.yaml'

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

    const appContainer = dockerComposeEnvironment.getContainer('app-1')

    const appPort = Number(process.env.API_PORT) || 8080

    appUrl = `http://${appContainer.getHost()}:${appContainer.getMappedPort(appPort)}/api/v1/user`
  }, timeoutTest)

  afterAll(async () => {
    if (dockerComposeEnvironment) await dockerComposeEnvironment.down()

    // Cancel the modification of the env variable
    process.env = originalEnv
    // logger.info("Docker Compose test environment stopped for integration tests on user/.")
  }, timeoutTest)

  describe('routes > user > /user GET', () => {
    it('Should maintain stable memory usage under load', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -m GET "${appUrl}"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })

      const output = stdout || stderr

      // Look for key performance indicators
      expect(output).to.include('requests in')
      expect(output).not.to.include('errors')

      // Parse the output to get specific metrics
      const avgLatencyLine = output.split('\n').at(7)

      if (!avgLatencyLine) expect.fail('wrong format for result line')

      const avgLatencyLineValues = avgLatencyLine.split('│')

      if (avgLatencyLineValues instanceof Array) {
        const avgLatencyStr = avgLatencyLineValues[6]
        if (!avgLatencyStr) expect.fail('invalid value for avg latency')
        const avgLatency = parseFloat(avgLatencyStr)
        expect(avgLatency).to.be.below(3000)
      } else {
        expect.fail('Average latency not found in autocannon output.')
      }
    }, timeoutTest)
  })
})
