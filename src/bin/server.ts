import 'dotenv/config'
import * as http from 'http'
import sdk from './tracing.js'
import app from '../app.js'
import { getConnection, closeConnection } from '../v1/infrastructure/persistence/database/db_connection/connectionFile.js'
import { logger } from '../v1/helpers/logger/index.js'

const localIp: string = process.env.API_HOST || 'localhost'

const port: number = Number(process.env.API_PORT) || 8080

const server: http.Server = http.createServer(app)

// Graceful shutdown
const shutdown = async () => {
  try {
    // Close database connection
    logger.info('Closing database connection pool ...')
    await closeConnection()
    logger.info('Database connection pool closed')
    // Close monitoring tracing scrapping
    logger.info('Closing monitoring tracing scrapping ...')
    // We do not await sdk.shutdown() because if the OTEL collector is not available (e.g. in tests),
    // it will hang until timeout. This hang prevents the process from exiting gracefully, which in turn
    // prevents the V8 coverage data from being written to disk.
    sdk.shutdown()
    logger.info('Monitoring tracing scrapping closed')
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', String(error))
    process.exit(1)
  }
}

server.on('error', (error) => {
  logger.error(JSON.stringify(error))
  shutdown()
  process.exit(1)
})

try {
  logger.info('Starting node-sdk tracing ...')
  sdk.start()
  logger.info('node-sdk tracing started')
} catch (error) {
  logger.error('Error starting node-sdk tracing', String(error))
}

server.on('listening', async () => {
  if (!process.env.production) logger.info(`app running ... api documentation on http://${localIp}:${port} - NODE_ENV: ${process.env.NODE_ENV}`)
  if (process.send) process.send('ready')

  // Database Connection Pre-heating
  try {
    logger.info('Setting up initial database connection pool ...')
    await getConnection()
    logger.info('Database connection pool established at server startup')
  } catch (error) {
    logger.warn(`Lazy loading DB connection pool failed during pre-heating - it will be initialized on first request - error: ${String(error)}`)
  }
})

// Setup process handlers
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

server.listen(port, '0.0.0.0')
