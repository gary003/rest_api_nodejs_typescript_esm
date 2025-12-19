import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as connectionFile from '../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import * as customerModule from '../../../src/v1/infrastructure/persistence/database/customer/index.js'
import logger from '../../../src/v1/helpers/logger/index.js'
import { Readable } from 'node:stream'
import { ReadStream } from 'node:fs'
import { DataSource } from 'typeorm'

// 1. Mock the modules (Hoisted by Vitest)
vi.mock('../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js', () => ({
  getConnection: vi.fn()
}))

vi.mock('../../../src/v1/helpers/logger/index.js', () => ({
  default: {
    error: vi.fn()
  }
}))

describe('Unit tests - infrastructure:database:customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DB_URI = ''
    process.env.DB_HOST = ''
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

  describe('src > v1 > infrastructure > database > customer > index > customerStreamAdaptor', () => {
    it('should adapt stream data correctly', async () => {
      const mockChunks = [
        {
          customer_customer_id: 'customer1_id',
          customer_firstname: 'John',
          customer_lastname: 'Doe',
          wallet_customer_id: 'customer1_id',
          wallet_wallet_id: 'wallet1',
          wallet_hard_currency: 1000,
          wallet_soft_currency: 500
        }
      ]

      const mockStream = Readable.from(mockChunks) as ReadStream
      const adaptor = customerModule.customerStreamAdaptor(mockStream)

      const results: string[] = []
      for await (const item of adaptor) {
        results.push(item)
      }

      expect(results).toHaveLength(1)
      expect(results[0]).toBe(
        JSON.stringify({
          userId: 'customer1_id',
          firstname: 'John',
          lastname: 'Doe',
          Wallet: {
            walletId: 'wallet1',
            hardCurrency: 1000,
            softCurrency: 500
          }
        }) + '\n'
      )
    })

    it('should handle stream errors', async () => {
      const mockStream = new Readable({
        objectMode: true,
        read() {
          this.destroy(new Error('Stream read error'))
        }
      })

      try {
        const adaptor = customerModule.customerStreamAdaptor(mockStream as ReadStream)
        await adaptor.next()
        expect.fail('Expected an error to be thrown')
      } catch (err: unknown) {
        expect(err).toBeDefined()
        expect((err as Error).message).toContain('Stream Adaptor error')

        // Verify logger call
        expect(logger.error).toHaveBeenCalledTimes(1)
      }
    })
  })
})
