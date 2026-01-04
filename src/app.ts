import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import userRoute from './v1/presentation/routes/user/index.js'
import authRoute from './v1/presentation/routes/auth/index.js'

import swaggerUi from 'swagger-ui-express'
import apiDocumentation from './v1/helpers/apiDocumentation/v2/index.js'
import openApiSpec from './v1/helpers/apiDocumentation/v3/index.js'

import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'
import logger from './v1/helpers/logger/index.js'

import rateLimit from 'express-rate-limit'

const app = express()

const urlBase: string = 'api/v1'

if (!process.env.production) {
  logger.info(`Environment: ${process.env.NODE_ENV}`)
  // openAPI V2
  if(process.env.NODE_ENV === 'development')
    app.use(`/${urlBase}/apiDocumentation`, swaggerUi.serve, swaggerUi.setup(apiDocumentation))
  else// openAPI V3
    app.use(`/${urlBase}/apiDocumentation`, swaggerUi.serve, swaggerUi.setup(openApiSpec))
}

app.use(compression())
app.use(helmet())
app.use(
  cors({
    origin: true, // Reflect origin (more permissive for dev)
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
app.use(express.json())

app.get(`/${urlBase}/health`, (_ : Request , res : Response) => {
  return res.status(200).json({ message: 'OK' })
})

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })) // 100 req/15min

// Redirect root URL to /apiDocV3
app.get('/', (_ : Request , res : Response) => {
  return res.status(302).redirect(`/${urlBase}/apiDocumentation`)
})

app.use(`/${urlBase}/auth`, authRoute)
app.use(`/${urlBase}/user`, userRoute)

const handleNotFound = (_: Request, res: Response, next: NextFunction) => {
  // Check if any route handler has already handled the request
  if (res.headersSent) {
    return next() // Let other error handlers handle it if already responded to
  }

  return res.status(404).json({ message: 'Not Found' })
}

// eslint-disable-next-line no-unused-vars
const handleError = (err: Error, _: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack) // Log the error for debugging

  // Set default status code to 500 (Internal Server Error)
  let statusCode = 500

  // Map specific error types to appropriate status codes
  if (err.name === 'ValidationError') {
    statusCode = 400 // Bad request for validation errors
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401 // Unauthorized for authentication errors
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403 // Forbidden for authorization errors
  }

  // Craft a generic error response with optional details based on environment
  const errorResponse = {
    message: 'Internal Server Error', // Default message
    error: ''
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message // Include more details in development
  }

  res.status(statusCode).json(errorResponse)
}

// Not found handler
app.use(handleNotFound)

// Error handler middleware
app.use(handleError)

export default app
