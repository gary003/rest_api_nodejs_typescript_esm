import { describe, it, expect, afterAll, beforeAll } from 'vitest'

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import { userWalletDTO } from '../../src/v1/services/user/dto'
import { parseAutocannonOutput } from './adaptatorsHelpers'
import { getTestUrls, getDockerTestEnvVariables } from '../vitest.setup'

const execAsync = promisify(exec)

const timeoutTest = 120 * 1000

describe('Load tests - presentation:routes:user', () => {
  // Dont accidentally fetch the real database (use the containerized test environment) !
  process.env.DB_URI = ''
  process.env.DB_HOST = ''

  // Save the original environment variables to restore them after the tests
  const originalEnv = { ...process.env } as const

  // Test environment variables from vitest.setup.ts to use in the tests
  const test_env = getDockerTestEnvVariables()

  // Modify the env variables to use the containerized test environment
  process.env = { ...process.env, ...test_env }

  // Use the environment variables set in vitest.setup.ts
  const {appUrl, dbUriTest} = getTestUrls()
  const urlBase: string = 'api'

  // logger.debug(`dbUriTest: ${dbUriTest}, appUrl: ${appUrl}`)
  // logger.debug(`urlBase: ${urlBase}`)

  // Important, set the DB env variables to use the db in the containerized test environment
  process.env.DB_URI = dbUriTest

  // Those users will be used in the tests (need to be global to be fetched in the beforeAll block & used in the tests)
  let allUsers: userWalletDTO[] = []

  beforeAll(async () => {
    try {
      const url = `${appUrl}/${urlBase}/user`
      // logger.debug(`url: ${url}`)
      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const resJson = await response.json()
      allUsers = resJson.data
    } catch (error) {
      expect.fail(`Error - Impossible to get the data stream from route - ${String(error)}`)
    }
  }, timeoutTest)

  it('Should have at least 2 users with funds for testing', () => {
    expect(allUsers).to.be.an('array')
    expect(allUsers.length).to.be.at.least(2)
  })
    
  afterAll(async () => {
    // Cancel the modification of the env variable
    process.env = originalEnv
  })

  describe('routes > user > /user GET', () => {
    it('Should maintain stable memory usage under load - GET /user', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m GET "${appUrl}/${urlBase}/user"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(10000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/:userId GET', () => {
    it('Should maintain stable memory usage under load - GET /user/:userId ', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m GET "${appUrl}/${urlBase}/user/${allUsers[0].userId}"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr
      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(10000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/ POST', () => {
    it('Should maintain stable memory usage under load - POST /user', async () => {
      const cmd = `npx autocannon -c 50 -d 5 -j -m POST --body '{"firstname": "Test", "lastname": "User"}' -H 'Content-Type: application/json' "${appUrl}/${urlBase}/user"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0)
        expect(metrics.non2xxResponses).to.equal(0)
        expect(metrics.avgLatency).to.be.below(5000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })

  describe('routes > user > /user/transfer', () => {
    it('Should successfully handle query locks validity under heavy load - POST /user/transfer', async () => {
      // Pick users that have enough money (seeded users)
      const fundedUsers = allUsers.filter(u => u.Wallet && (u.Wallet.hardCurrency ?? 0) > 100)
      const user1 = fundedUsers.at(0)
      const user2 = fundedUsers.at(1) || allUsers.find(u => u.userId !== user1?.userId)

      if (!user1 || !user2 || user1.userId === user2.userId) {
        expect.fail('Error - Could not find two distinct users for transfer test')
      }

      // Use -a 100 to limit total requests and avoid draining the wallet
      // Added -t 20 to increase timeout for slow environments
      const cmd = `npx autocannon -c 6 -a 100 -t 20 -j -m POST --body '{"senderId": "${user1.userId}", "receiverId": "${user2.userId}", "amount": 1, "currency": "hardCurrency"}' -H 'Content-Type: application/json' "${appUrl}/${urlBase}/user/transfer"`

      const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 })
      const output = stdout || stderr

      try {
        const metrics = parseAutocannonOutput(output)
        
        expect(output).to.include('requests')
        expect(metrics.successfulResponses).to.be.greaterThan(0, 'Should have at least some successful transfers')
        expect(metrics.non2xxResponses).to.equal(0, `Should have no failed requests (found ${metrics.non2xxResponses})`)
        expect(metrics.avgLatency).to.be.below(10000)
      } catch(err) {
        expect.fail(`Failed to parse autocannon output - ${err}`)
      }
    }, timeoutTest)
  })
})