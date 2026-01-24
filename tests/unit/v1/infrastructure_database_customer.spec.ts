import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import * as connectionFile from '../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import * as customerModule from '../../../src/v1/infrastructure/persistence/database/customer/index.js'
import { logger } from '../../../src/v1/helpers/logger/index.js'
import { DataSource } from 'typeorm'

// 1. Mock the modules (Hoisted by Vitest)
vi.mock('../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js', () => ({
  getConnection: vi.fn()
}))

vi.mock('../../../src/v1/helpers/logger/index.js', () => ({
  logger: {
    error: vi.fn()
  }
}))

describe('Unit tests - infrastructure:database:customer', () => {
  const originalEnv = { ...process.env } as const

  // Dont accidentially use real DB
  process.env.DB_URI = ''
  process.env.DB_HOST = ''

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('src > v1 > infrastructure > database > customer > index > getAllCustomersDB', () => {
    it('should successfully retrieve all customers with their wallets', async () => {
      // Prepare mock data
      const mockUsers = [
        {
          customer_id: 'customer1',
          firstname: 'John',
          lastname: 'Doe',
          Wallet: {
            wallet_id: 'wallet1',
            hard_currency: 1000,
            soft_currency: 500
          }
        }
      ]

      // Create mock chain using Vitest functions
      const mockQueryBuilder = {
        innerJoinAndMapOne: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockUsers)
      }

      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder)
      }

      const mockConnection = {
        getRepository: vi.fn().mockReturnValue(mockRepository)
      }

      // Stub getConnection using the vi.mocked helper
      vi.mocked(connectionFile.getConnection).mockResolvedValue(mockConnection as unknown as DataSource)

      try {
        const result = await customerModule.getAllCustomersDB()

        // Assertions
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
        expect(result).toHaveLength(mockUsers.length)

        // Verify calls
        expect(connectionFile.getConnection).toHaveBeenCalledTimes(1)
        expect(mockQueryBuilder.innerJoinAndMapOne).toHaveBeenCalledTimes(1)
        expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1)
      } catch (err) {
        expect.fail(`Unexpected error: ${err}`)
      }
    })

    it('should throw an error when database query fails', async () => {
      const mockError = new Error('Database connection error')

      const mockQueryBuilder = {
        innerJoinAndMapOne: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockRejectedValue(mockError)
      }

      const mockRepository = {
        createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder)
      }

      const mockConnection = {
        getRepository: vi.fn().mockReturnValue(mockRepository)
      }

      vi.mocked(connectionFile.getConnection).mockResolvedValue(mockConnection as unknown as DataSource)

      try {
        await customerModule.getAllCustomersDB()
        expect.fail('Expected an error to be thrown')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        expect((err as Error).message).toContain('Impossible to retrieve any')

        // Verify logger and connection calls
        expect(logger.error).toHaveBeenCalled()
        expect(connectionFile.getConnection).toHaveBeenCalledTimes(1)
      }
    })
  })
})
