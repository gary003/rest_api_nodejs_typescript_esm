import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as modUserDB from '../../../src/v1/infrastructure/persistence/database/customer/index.js'
import * as modWalletDB from '../../../src/v1/infrastructure/persistence/database/wallet/index.js'
import * as modConnection from '../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import { moneyTypes, moneyTypesO } from '../../../src/v1/domain/index.js'
import { addCurrency, deleteUserById, saveNewUser, transferMoney, transferMoneyParamsValidator, transferMoneyWithRetry } from '../../../src/v1/services/user/index.js'
import { moneyTransferParamsValidatorErrors, transferMoneyErrors, userFunctionsErrors, transferMoneyWithRetryErrors } from '../../../src/v1/services/user/error.dto.js'
import { transactionQueryRunnerType } from '../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import logger from '../../../src/v1/helpers/logger/index.js'
import { Customer } from '../../../src/v1/infrastructure/persistence/database/customer/entity.js'
import { userWalletDTO } from '../../../src/v1/services/user/dto.js'

// Mock external dependencies
vi.mock('../../../src/v1/infrastructure/persistence/database/customer/index.js')
vi.mock('../../../src/v1/infrastructure/persistence/database/wallet/index.js')
vi.mock('../../../src/v1/infrastructure/persistence/database/db_connection/connectionFile.js')
vi.mock('../../../src/v1/helpers/logger/index.js')

describe('Unit tests - services:user', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv }
    process.env.DB_URI = ''
    process.env.DB_HOST = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('src > v1 > services > user > index > saveNewUser', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should create a new user', async () => {
      const fakeUserDB = {
        customer_id: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        wallet: {
          wallet_id: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hard_currency: 2000,
          soft_currency: 2000
        }
      } as unknown as Customer

      vi.mocked(modUserDB.saveNewCustomerDB).mockResolvedValue(fakeUserDB)

      try {
        const response = await saveNewUser(fakeUserDB.firstname, fakeUserDB.lastname)

        expect(response).toBeDefined()
        expect(modUserDB.saveNewCustomerDB).toHaveBeenCalledTimes(1)
      } catch (err) {
        expect.fail(`Should not happen - no error in catch expected - ${err}`)
      }
    })
    it('should fail creating a new user', async () => {
      const fakeUser = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      vi.mocked(modUserDB.saveNewCustomerDB).mockRejectedValue(new Error('DB Error'))
      // logger is mocked automatically

      try {
        await saveNewUser(fakeUser.firstname, fakeUser.lastname)
        expect.fail('Unexpected success')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        } else {
          expect(err.message).toContain(userFunctionsErrors.ErrorCreatingUser!.message)
          expect(modUserDB.saveNewCustomerDB).toHaveBeenCalledTimes(1)
          expect(logger.error).toHaveBeenCalledTimes(1)
        }
      }
    })
  })

  describe('src > v1 > services > user > index > addCurrency', () => {
    it('should succeed adding currency', async () => {
      const fakeUser = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }
      vi.mocked(modUserDB.getCustomerWalletInfoDB).mockResolvedValue(fakeUser)
      vi.mocked(modWalletDB.updateWalletByWalletIdDB).mockResolvedValue(true)

      const amountToAdd = 150
      try {
        const res = await addCurrency('22ef5564-0234-11ed-b939-0242ac120002', moneyTypesO.soft_currency, amountToAdd)
        expect(res).toBe(true)
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(1)
        expect(modWalletDB.updateWalletByWalletIdDB).toHaveBeenCalledTimes(1)
      } catch (err) {
        expect.fail(`Should not get an error - ${String(err)}`)
      }
    })
    it('should fail (negative amount)', async () => {
      const amountToAdd = -55

      try {
        await addCurrency('22ef5564-0234-11ed-b939-0242ac120002', moneyTypesO.soft_currency, amountToAdd)
        expect.fail('Unexpected success')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorInvalidAmount!.message)
      }
    })
    it('should fail (wrong currency type)', async () => {
      const amountToAdd = 150
      try {
        await addCurrency('22ef5564-0234-11ed-b939-0242ac120002', 'fake_currency_type' as moneyTypes, amountToAdd)
        expect.fail('Unexpected success - Should never happen')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorCurrencyType!.message)
      }
    })
  })

  describe('src > v1 > services > user > index > deleteUserById', () => {
    it('should delete a single user from DB by its id', async () => {
      const userToFetch: string = '22ef5564-0234-11ed-b939-0242ac120002'

      vi.mocked(modUserDB.deleteCustomerByIdDB).mockResolvedValue(true)

      try {
        const response = await deleteUserById(userToFetch)
        expect(response).toBeDefined()
        expect(response).toBe(true)
        expect(modUserDB.deleteCustomerByIdDB).toHaveBeenCalledTimes(1)
      } catch (err) {
        expect.fail(`Fail - Unable to delete the user - ${err}`)
      }
    })
  })

  describe('src > v1 > services > user > index > transferMoneyParamsValidator', () => {
    it('Should return the 2 users info objects correctly', async () => {
      const validCurrency = moneyTypesO.soft_currency
      const fakeUserGiver = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000 // Sufficient funds
        }
      }

      const fakeUserRecipient = {
        userId: 'fake_09lo1234-0234-45rt-n632-0242ac129997',
        firstname: 'fake_Michael',
        lastname: 'fake_Mercer',
        Wallet: {
          walletId: 'fake_888f73b6-027d-11ed-b939-0242ac120987',
          hardCurrency: 2400,
          softCurrency: 6700
        }
      }

      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      const amount = 100

      const [giverUserInfo, recipientUserInfo] = await transferMoneyParamsValidator(validCurrency, fakeUserGiver.userId, fakeUserRecipient.userId, amount)

      expect(giverUserInfo).toBeTypeOf('object')
      expect(recipientUserInfo).toBeTypeOf('object')
    })
    it('Should throw an error for invalid currency type', async () => {
      const fakeUserGiver = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      const fakeUserRecipient = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      const invalidCurrency = 'invalid_currency'
      const amount = 100

      try {
        await transferMoneyParamsValidator(invalidCurrency as moneyTypes, fakeUserGiver.userId, fakeUserRecipient.userId, amount)
        expect.fail('Expected error for invalid currency')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorCurrencyType!.message)
        expect(modUserDB.getCustomerWalletInfoDB).not.toHaveBeenCalled()
      }
    })
    it('Should throw an error for insufficient funds', async () => {
      const validCurrency = moneyTypesO.soft_currency
      const fakeUserGiver = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 100 // Insufficient funds
        }
      }

      const fakeUserRecipient = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      const amount = 200 // Attempt to transfer more than available

      try {
        await transferMoneyParamsValidator(validCurrency, fakeUserGiver.userId, fakeUserRecipient.userId, amount)
        expect.fail('Expected error for insufficient funds')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorInsufficientFunds!.message)
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(1)
      }
    })
    it('Should throw an error if retrieving giver user info fails', async () => {
      const validCurrency = moneyTypesO.soft_currency
      const fakeUserRecipient = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockRejectedValueOnce(new Error('test - 1'))
        .mockRejectedValueOnce(null)

      const amount = 100

      try {
        await transferMoneyParamsValidator(validCurrency, 'fake_giver_id', fakeUserRecipient.userId, amount) // Use a fake giver ID
        expect.fail('Expected error retrieving giver user info')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorUserInfo!.message) // Verify specific error message
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalled()
      }
    })
    it('Should throw an error if retrieving receiver user info fails', async () => {
      const validCurrency = moneyTypesO.soft_currency
      const fakeUserRecipient = {
        userId: 'fake_22ef5564-0234-11ed-b939-0242ac120002',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      const fakeUserGiver = {
        // Define fake giver object but don't use it
        userId: 'fake_giver_id',
        firstname: 'fake_Eugene',
        lastname: 'fake_Porter',
        Wallet: {
          walletId: 'fake_515f73c2-027d-11ed-b939-0242ac120002',
          hardCurrency: 2000,
          softCurrency: 2000
        }
      }

      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockRejectedValueOnce(new Error('DB Error'))

      const amount = 100

      try {
        await transferMoneyParamsValidator(validCurrency, 'fake_giver_id', fakeUserRecipient.userId, amount) // Use a fake giver ID
        expect.fail('Expected error retrieving giver user info')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(moneyTransferParamsValidatorErrors.ErrorUserInfo!.message) // Verify specific error message
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(2)
        expect(logger.error).toHaveBeenCalled()
      }
    })
  })

  describe('src > v1 > services > user > index > transferMoney', () => {
    it('Successful transfer', async () => {
      // Setup mocks for successful transfer
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO

      // Mock getCustomerWalletInfoDB to return giver then recipient
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValue({ someTransactionObject: true } as unknown as transactionQueryRunnerType)
      
      vi.mocked(modConnection.acquireLockOnWallet).mockResolvedValue(true)
      vi.mocked(modWalletDB.updateWalletByWalletIdTransaction).mockResolvedValue(true)

      // Call the transferMoney function
      const result = await transferMoney(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100)

      // Verify
      expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(2)
      expect(modConnection.createAndStartTransaction).toHaveBeenCalledTimes(1)
      expect(modConnection.acquireLockOnWallet).toHaveBeenCalledTimes(2)
      expect(modWalletDB.updateWalletByWalletIdTransaction).toHaveBeenCalledTimes(2)
      expect(modConnection.commitAndQuitTransactionRunner).toHaveBeenCalledTimes(1)
      expect(modConnection.rollBackAndQuitTransactionRunner).not.toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('Transfer failure due to transferMoneyParamsValidator error', async () => {
      // Mock getCustomerWalletInfoDB to fail for giver
      vi.mocked(modUserDB.getCustomerWalletInfoDB).mockRejectedValue(new Error('Validation Error'))

      try {
        await transferMoney(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100)
        expect.fail('Unexpected successful transfer')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        // The error will be wrapped in "serviceError: ... \n databaseError: ..."
        expect(err.message).toContain(transferMoneyErrors.ErrorParamsValidator!.message)
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(1)
        expect(modConnection.createAndStartTransaction).not.toHaveBeenCalled()
        expect(logger.error).toHaveBeenCalled()
      }
    })

    it('Transfer failure due to createAndStartTransaction error', async () => {
      // Setup mocks for successful validation
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      // Mock transaction creation failure
      vi.mocked(modConnection.createAndStartTransaction).mockRejectedValue(new Error('Transaction Error'))

      try {
        await transferMoney(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100)
        expect.fail('Unexpected successful transfer')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(transferMoneyErrors.ErrorTransactionCreation!.message)
        expect(modUserDB.getCustomerWalletInfoDB).toHaveBeenCalledTimes(2)
        expect(modConnection.createAndStartTransaction).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalled()
        expect(modConnection.acquireLockOnWallet).not.toHaveBeenCalled()
      }
    })

    it('Transfer failure due to acquireLockOnWallet failure (giver)', async () => {
      // Setup mocks for successful validation and transaction
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)
      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValue({ someTransactionObject: true } as unknown as transactionQueryRunnerType)

      // Mock lock failure
      vi.mocked(modConnection.acquireLockOnWallet)
        .mockRejectedValueOnce(new Error('lock test Error'))
        .mockResolvedValueOnce(true)

      try {
        await transferMoney(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100)
        expect.fail('Unexpected successful transfer')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(transferMoneyErrors.ErrorLockAcquisition!.message)
        expect(modConnection.createAndStartTransaction).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalled()
        expect(modConnection.acquireLockOnWallet).toHaveBeenCalledTimes(2)
        expect(modWalletDB.updateWalletByWalletIdTransaction).not.toHaveBeenCalled()
      }
    })

    it('Transfer failure due to acquireLockOnWallet failure (recipient)', async () => {
      // Setup mocks for successful validation and transaction
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)
      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValue({ someTransactionObject: true } as unknown as transactionQueryRunnerType)

      // Mock lock failure for recipient
      vi.mocked(modConnection.acquireLockOnWallet)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('lock test Error'))

      try {
        await transferMoney(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100)
        expect.fail('Unexpected successful transfer')
      } catch (err: unknown) {
        if (!(err instanceof Error) || err?.message === null) {
          expect.fail('Please use a correct error format')
        }
        expect(err.message).toContain(transferMoneyErrors.ErrorLockAcquisition!.message)
        expect(modConnection.acquireLockOnWallet).toHaveBeenCalledTimes(2)
        expect(modWalletDB.updateWalletByWalletIdTransaction).not.toHaveBeenCalled()
      }
    })
  })

  // For transferMoneyWithRetry, we need to mock transferMoney.
  // Since transferMoney is in the same module, we cannot easily mock it with vi.mock if it's called internally.
  // BUT transferMoneyWithRetry calls transferMoney.
  // If we want to mock transferMoney, we might need to use a different approach or accept we test the integration.
  // However, the original test mocked it.
  // If the original test worked, it means they were able to stub it.
  // In Vitest/ESM, we can't stub internal calls easily.
  //
  // Workaround: We can mock the dependencies of transferMoney to simulate failure/success.
  
  describe('src > v1 > services > user > index > transferMoneyWithRetry', () => {
    // Since we cannot mock transferMoney directly because it's an internal call,
    // we will mock the dependencies of transferMoney to simulate the scenarios.
    
    it('Successful transfer (no retry)', async () => {
      // Mock dependencies to succeed
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)
      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValue({ someTransactionObject: true } as unknown as transactionQueryRunnerType)
      vi.mocked(modConnection.acquireLockOnWallet).mockResolvedValue(true)
      vi.mocked(modWalletDB.updateWalletByWalletIdTransaction).mockResolvedValue(true)

      const result = await transferMoneyWithRetry(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100, 300)

      expect(result).toBe(true)
      expect(modConnection.createAndStartTransaction).toHaveBeenCalledTimes(1)
    })

    it('Successful transfer (with 1 retry)', async () => {
      // Mock dependencies to fail once with Lock error, then succeed
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      
      // Attempt 1: Validation succeeds, Transaction succeeds, Lock fails (Error - Lock)
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)
      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValueOnce({ someTransactionObject: true } as unknown as transactionQueryRunnerType)
      vi.mocked(modConnection.acquireLockOnWallet)
        .mockRejectedValueOnce(new Error('Error - Lock - Network error'))

      // Attempt 2: Succeeds
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)
      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValueOnce({ someTransactionObject: true } as unknown as transactionQueryRunnerType)
      vi.mocked(modConnection.acquireLockOnWallet)
        .mockResolvedValue(true) // Subsequent calls succeed
      vi.mocked(modWalletDB.updateWalletByWalletIdTransaction).mockResolvedValue(true)

      const result = await transferMoneyWithRetry(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100, 300)

      expect(result).toBe(true)
      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('Failure - Transfer fail (non-retryable error)', async () => {
      // Mock dependencies to fail with non-retryable error (e.g. Insufficient Funds)
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 50 } } as userWalletDTO // Insufficient funds
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      
      vi.mocked(modUserDB.getCustomerWalletInfoDB)
        .mockResolvedValueOnce(fakeUserGiver)
        .mockResolvedValueOnce(fakeUserRecipient)

      try {
        await transferMoneyWithRetry(moneyTypesO.soft_currency, 'giver123', 'recipient456', 100, 300)
      } catch (err: unknown) {
        expect((err as Error).message).toContain(moneyTransferParamsValidatorErrors.ErrorInsufficientFunds!.message)
        expect(logger.error).toHaveBeenCalled()
      }
    })

    it('Failure - Transfer fail (Maximum retries exceeded)', async () => {
      // Mock dependencies to always fail with Lock error
      const fakeUserGiver = { Wallet: { walletId: '1234', softCurrency: 123 } } as userWalletDTO
      const fakeUserRecipient = { Wallet: { walletId: '4321', softCurrency: 300 } } as userWalletDTO
      
      vi.mocked(modUserDB.getCustomerWalletInfoDB).mockResolvedValue(fakeUserGiver) // Always return valid user
      // But we need to make sure we return different users for giver/recipient if needed, but here we can just reuse
      // Actually getCustomerWalletInfoDB is called twice per attempt.
      // So we need to mock it enough times or use mockImplementation
      vi.mocked(modUserDB.getCustomerWalletInfoDB).mockImplementation(async (id) => {
        if (id === 'giver123') return fakeUserGiver
        return fakeUserRecipient
      })

      vi.mocked(modConnection.createAndStartTransaction)
        .mockResolvedValue({ someTransactionObject: true } as unknown as transactionQueryRunnerType)
      
      vi.mocked(modConnection.acquireLockOnWallet)
        .mockRejectedValue(new Error('Error - Lock - Network error'))

      const maxAttempt = 3
      const amountToTransfer = 100
      const delay = 10
      try {
        await transferMoneyWithRetry(moneyTypesO.soft_currency, 'giver123', 'recipient456', amountToTransfer, delay, maxAttempt)
      } catch (err: unknown) {
        expect((err as Error).message).toContain(transferMoneyWithRetryErrors.ErrorMaxRetry!.message)
        expect(logger.warn).toHaveBeenCalled()
        expect(logger.error).toHaveBeenCalled()
      }
    })
  })
})
