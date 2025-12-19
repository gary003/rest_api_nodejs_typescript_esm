import { QueryRunner, DataSource } from 'typeorm'
import { tryToConnectDB } from './connector.js'
import logger from '../../../../helpers/logger/index.js'

import { setTimeout } from 'timers/promises'

export type transactionQueryRunnerType = QueryRunner

// This is the permanent connection to the DB that will be reuse through the whole app cycle
let connection: DataSource | null = null



/**
 * Connects to the database with retry logic for transient failures.
 * @param {number} currentAttempt - The current retry attempt (default: 1).
 * @param {number} maxAttempts - The maximum number of retry attempts (default: 4).
 * @param {number} delay - The initial delay between retries in milliseconds (default: 150).
 * @returns {Promise<DataSource>} - The initialized database connection.
 * @throws {Error} - If the connection fails after max attempts.
 */
export const connectionDB = async (currentAttempt: number = 1, maxAttempts: number = 4, delay: number = 150): Promise<DataSource> => {
  try {
    return await tryToConnectDB() // Attempt to connect
  } catch (error) {
    if (currentAttempt < maxAttempts) {
      const waitTime = delay * Math.pow(2, currentAttempt) // Exponential backoff
      logger.warn(`Warning - fail to connect to DB - retry in ${waitTime} seconds`)
      await setTimeout(waitTime) // Wait before retrying
      return connectionDB(currentAttempt + 1, maxAttempts, delay) // Retry connection
    }

    // Throw error if max attempts reached
    const errorInfo = `Error - Impossible to connect to db after ${maxAttempts} attempts - ${String(error)}`
    logger.error(errorInfo)
    throw new Error(errorInfo)
  }
}

/**
 * Gets or creates a database connection. Reuses an existing connection if available.
 * @returns {Promise<DataSource>} - The database connection.
 * @throws {Error} - If the connection fails.
 */
export const getConnection = async (): Promise<DataSource> => {
  if (connection && connection.isInitialized) return connection // Return existing connection if available

  const newConnection = await connectionDB().catch((err) => err) // Attempt to connect

  if (newConnection instanceof Error) {
    const errorMessage = `Failed to establish database connection - ${String(newConnection)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  return newConnection // Return the new connection
}

/**
 * Closes the database connection if it exists and is initialized.
 * @returns {Promise<void>}
 * @throws {Error} - If closing the connection fails.
 */
export const closeConnection = async (): Promise<void> => {
  if (!connection || !connection.isInitialized) return

  try {
    await connection.destroy() // Destroy the connection
    connection = null // Clear the connection object
  } catch (error) {
    const errorMessage = `Error closing database connection - ${String(error)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Creates and starts a new database transaction.
 * @returns {Promise<QueryRunner>} - The query runner for the transaction.
 * @throws {Error} - If the transaction cannot be created.
 */
export const createAndStartTransaction = async (): Promise<QueryRunner> => {
  try {
    const connection = await getConnection() // Get database connection
    const queryRunner = connection.createQueryRunner() // Create query runner
    await queryRunner.connect() // Connect the query runner
    await queryRunner.startTransaction() // Start the transaction
    return queryRunner
  } catch (error) {
    const errorMessage = `Error impossible to create transaction runner object - ${String(error)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Commits and releases a transaction.
 * @param {QueryRunner} queryRunner - The query runner for the transaction.
 * @returns {Promise<boolean>} - True if the transaction is successfully committed.
 * @throws {Error} - If committing the transaction fails.
 */
export const commitAndQuitTransactionRunner = async (queryRunner: QueryRunner): Promise<boolean> => {
  try {
    await queryRunner.commitTransaction() // Commit the transaction
    await queryRunner.release() // Release the query runner
    return true
  } catch (error) {
    const errorMessage = `Error trying to commit transaction to DB - ${String(error)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Rolls back and releases a transaction.
 * @param {QueryRunner} queryRunner - The query runner for the transaction.
 * @returns {Promise<boolean>} - True if the transaction is successfully rolled back.
 * @throws {Error} - If rolling back the transaction fails.
 */
export const rollBackAndQuitTransactionRunner = async (queryRunner: QueryRunner): Promise<boolean> => {
  try {
    await queryRunner.rollbackTransaction() // Rollback the transaction
    await queryRunner.release() // Release the query runner
    return true
  } catch (error) {
    const errorMessage = `Error trying to rollback transaction - ${String(error)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }
}

/**
 * Acquires a lock on a wallet for transaction safety.
 * @param {QueryRunner} queryRunner - The query runner for the transaction.
 * @param {string} walletId - The ID of the wallet to lock.
 * @returns {Promise<boolean>} - True if the lock is successfully acquired.
 * @throws {Error} - If acquiring the lock fails.
 */
export const acquireLockOnWallet = async (queryRunner: QueryRunner, walletId: string): Promise<boolean> => {
  const lockResult = await queryRunner.query('SELECT * FROM wallet WHERE wallet_id = ? FOR UPDATE', [walletId]).catch((err) => err)

  if (lockResult instanceof Error) {
    const errorInfo = `Error - Impossible to set the lock for db transaction - ${String(lockResult)}`
    logger.error(errorInfo)
    throw new Error(errorInfo)
  }

  return lockResult.length > 0 // Return true if lock is acquired
}
