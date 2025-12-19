import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { DataSource } from 'typeorm'

// 1. Mock the module to intercept internal functions like tryToConnectDB
// 1. Mock the module to intercept internal functions like tryToConnectDB
vi.mock('../../../src/v1/infrastructure/persistence/database/db_connection/connector.js', () => ({
  tryToConnectDB: vi.fn()
}))

vi.mock('../../../src/v1/helpers/logger/index.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

import * as modConnector from '../../../src/v1/infrastructure/persistence/database/db_connection/connector.js'
import { connectionDB } from '../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import logger from '../../../src/v1/helpers/logger/index.js'

describe('Unit tests - infrastructure:database:db_connection', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DB_URI = ''
    process.env.DB_HOST = ''
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('src > v1 > infrastructure > database > db_connection > connectionFile > connectionDB', () => {
    it('Should successfully connect to DB on first attempt', async () => {
      const mockConnection = { someConnection: true } as unknown as DataSource

      // Setup mock
      vi.mocked(modConnector.tryToConnectDB).mockResolvedValue(mockConnection)

      const result = await connectionDB()

      expect(modConnector.tryToConnectDB).toHaveBeenCalledTimes(1)
      expect(logger.warn).not.toHaveBeenCalled()
      expect(result).toBe(mockConnection)
    })

    it('Should successfully connect to DB after one retry', async () => {
      const mockConnection = { someConnection: 'Ok' } as unknown as DataSource

      // Sequence: Fail once, then succeed
      vi.mocked(modConnector.tryToConnectDB).mockRejectedValueOnce(new Error('First attempt failed')).mockResolvedValueOnce(mockConnection)

      const result = await connectionDB()

      expect(modConnector.tryToConnectDB).toHaveBeenCalledTimes(2)
      expect(logger.warn).toHaveBeenCalledTimes(1)
      expect(result).toBe(mockConnection)
    })

    it('Should Successfully connect to DB on last attempt', async () => {
      const mockConnection = { someConnection: 'Ok3' } as unknown as DataSource

      // Setup sequence: fail 3 times, succeed on 4th
      vi.mocked(modConnector.tryToConnectDB)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockRejectedValueOnce(new Error('Third attempt failed'))
        .mockResolvedValueOnce(mockConnection)

      const result = await connectionDB()

      expect(modConnector.tryToConnectDB).toHaveBeenCalledTimes(4)
      expect(logger.warn).toHaveBeenCalledTimes(3)
      expect(result).toBe(mockConnection)
    })

    it('Should Fail after maximum connection attempts', async () => {
      const testError = new Error('Connection failed')
      vi.mocked(modConnector.tryToConnectDB).mockRejectedValue(testError)

      try {
        await connectionDB()
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).toBeDefined()
        const error = err as Error
        expect(error.message).toContain('Error - Impossible to connect to db after 4 attempts')
        expect(error.message).toContain('Connection failed')

        expect(modConnector.tryToConnectDB).toHaveBeenCalledTimes(4)
        expect(logger.warn).toHaveBeenCalledTimes(3)
        expect(logger.error).toHaveBeenCalled()
      }
    })

    it('Should successfully respects custom retry parameters', async () => {
      const testError = new Error('Connection failed')
      vi.mocked(modConnector.tryToConnectDB).mockRejectedValue(testError)

      try {
        // Execute test with custom parameters (2 attempts, 500ms base delay)
        await connectionDB(1, 2, 500)
        expect.fail('Should have thrown an error')
      } catch (err) {
        expect(err).toBeDefined()
        const error = err as Error
        expect(error.message).toContain('Error - Impossible to connect to db after 2 attempts')

        expect(modConnector.tryToConnectDB).toHaveBeenCalledTimes(2)
        expect(logger.warn).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledTimes(1)
      }
    })
  })
})
