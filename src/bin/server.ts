import 'dotenv/config'
import sdk from './tracing.js'
import * as http from 'http'
import app from '../app.js'
import { logger } from '../v1/helpers/logger/index.js'
import { closeConnection } from '../v1/infrastructure/persistence/database/db_connection/connectionFile.js'

const localIp: string = process.env.API_HOST || 'localhost'

const port: number = Number(process.env.API_PORT) || 8080

const server: http.Server = http.createServer(app)

// Graceful shutdown
const shutdown = async () => {
  try {
    // Close database connection
    await closeConnection()
    // Close monitoring tracing scrapping
    sdk.shutdown()
    process.exit(0)
  } catch (error) {
    logger.error('Error during shutdown:', error)
    process.exit(1)
  }
}

server.on('error', async (error) => {
  logger.error(JSON.stringify(error))
  shutdown()
  process.exit(1)
})

try {
  sdk.start()
  logger.info('node-sdk tracing started')
} catch (error) {
  logger.error('Error starting node-sdk tracing', error)
}

server.on('listening', async () => {
  if (!process.env.production) logger.info(`app running ... api documentation on http://${localIp}:${port} - NODE_ENV: ${process.env.NODE_ENV}`)
  if (process.send) process.send('ready')
})

// Setup process handlers
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

server.listen(port, '0.0.0.0')
