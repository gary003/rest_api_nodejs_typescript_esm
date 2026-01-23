import { DataSourceOptions, DataSource } from 'typeorm'
import { logger } from '../../../../helpers/logger/index.js'
import { v4 as uuidv4 } from 'uuid'
import { Customer } from '../customer/entity.js'
import { Wallet } from '../wallet/entity.js'

/**
 * Generates connection options for the database based on environment variables.
 * @returns {Promise<DataSourceOptions>} - The database connection options.
 */
const getConnectionOptions = async (): Promise<DataSourceOptions> => {
  const isSqlite = process.env.DB_DRIVER === 'sqlite'

  const baseOptions = {
    name: `db_connection_${uuidv4()}`, // Unique connection name
    type: process.env.DB_DRIVER, // Database type (e.g., mysql, sqlite)
    entities: [Customer, Wallet], // Explicitly list entity classes
    synchronize: false, // Disable auto-sync
    poolErrorHandler: (err: Error) => logger.error('Connection pool error:', err) // Handle pool errors
  }

  if (isSqlite) {
    return {
      ...baseOptions,
      database: process.env.DB_DATABASE_NAME, // Path to sqlite file
      flags: 0x00000040 | 0x00000002 // OPEN_CREATE | OPEN_READWRITE (optional, but good for explicit control)
    } as DataSourceOptions
  }

  return {
    ...baseOptions,
    host: process.env.DB_HOST, // Database host
    url: process.env.DB_URI, // Full database URL
    port: Number(process.env.DB_PORT), // Database port
    username: process.env.DB_USERNAME, // Database username
    password: process.env.DB_PASSWORD, // Database password
    database: process.env.DB_DATABASE_NAME, // Database name
    poolSize: 50, // Max connections in the pool
    idleTimeout: 30000,
    extra: {
      connectionLimit: 50, // Max connections (matches poolSize)
      queueLimit: 0 // No limit on queued requests
    }
  } as DataSourceOptions
}

/**
 * Attempts to connect to the database using the generated connection options.
 * @returns {Promise<DataSource>} - The initialized database connection.
 * @throws {Error} - If the connection fails.
 */
export const tryToConnectDB = async (): Promise<DataSource> => {
  try {
    const dbOptions: DataSourceOptions = await getConnectionOptions() // Get connection options
    const connection: DataSource = new DataSource(dbOptions) // Create new DataSource
    await connection.initialize() // Initialize the connection
    return connection
  } catch (error) {
    const errorMessage = `Failed to create a new connection to DB - ${String(error)}`
    logger.error(errorMessage) // Log connection error
    throw new Error(errorMessage)
  }
}
