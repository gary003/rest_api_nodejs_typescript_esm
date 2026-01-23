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
import { logger } from './v1/helpers/logger/index.js'

import rateLimit from 'express-rate-limit'

const app = express()

const urlBase: string = 'api'

app.use(compression())
app.disable('x-powered-by')
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' }
  })
)

// Add Security and Cache headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

if (process.env.NODE_ENV !== 'production') {
  // openAPI V2
  if (process.env.NODE_ENV === 'development')
    app.use(`/${urlBase}/apiDocumentation`, swaggerUi.serve, swaggerUi.setup(apiDocumentation)) // openAPI V3
  else app.use(`/${urlBase}/apiDocumentation`, swaggerUi.serve, swaggerUi.setup(openApiSpec))
}

app.use(
  cors({
    origin: true, // Reflect origin (more permissive for dev)
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)

app.use(express.json())

// Redirect absolute root to API Documentation
app
  .get('/', (_: Request, res: Response) => {
    return res.redirect(`/${urlBase}/apiDocumentation`)
  })
  .get(`/${urlBase}/`, (_: Request, res: Response) => {
    return res.redirect(`/${urlBase}/apiDocumentation`)
  })

app.get(`/${urlBase}/health`, (_: Request, res: Response) => {
  return res.status(200).json({ message: 'OK' })
})

if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'load') {
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })) // 100 req/15min
}

app.use(`/${urlBase}/auth`, authRoute)
app.use(`/${urlBase}/user`, userRoute)

const handleNotFound = (_: Request, res: Response, next: NextFunction) => {
  // Check if any route handler has already handled the request
  if (res.headersSent) {
    return next() // Let other error handlers handle it if already responded to
  }

  return res.status(404).json({ message: 'Not Found' })
}

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

  return res.status(statusCode).json(errorResponse)
}

// Not found handler
app.use(handleNotFound)

// Error handler middleware
app.use(handleError)

export default app
