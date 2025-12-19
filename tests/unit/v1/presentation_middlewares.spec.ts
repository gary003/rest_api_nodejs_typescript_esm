import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { isAdmin } from '../../../src/v1/presentation/middlewares/auth/isAdmin.js'
import { isAuthorized } from '../../../src/v1/presentation/middlewares/auth/isAuthorized.js'
import logger from '../../../src/v1/helpers/logger/index.js'
import { loggedUser } from '../../../src/v1/domain/dto/loggedUser.dto.js'

// Mock logger
vi.mock('../../../src/v1/helpers/logger/index.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

// Mock jsonwebtoken
vi.mock('jsonwebtoken', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>()
  return {
    ...actual,
    default: {
      ...actual.default,
      verify: vi.fn()
    },
    verify: vi.fn()
  }
})

describe('Unit tests - presentation:middlewares', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('src > v1 > presentation > middlewares > loggedUser > isAdmin', () => {
    it('Should succesfully pass the admin check (user is admin)', () => {
      // Arrange
      const mockRequest = {
        body: {
          user: { role: 'admin' }
        }
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Act
      isAdmin(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(nextFunction).toHaveBeenCalledTimes(1)
      expect(statusFn).not.toHaveBeenCalled()
    })

    it('Should fail to pass the admin check (user is not admin)', () => {
      // Arrange
      const mockRequest = {
        body: {
          user: { role: 'std_user' }
        }
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Act
      isAdmin(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'Middleware user:isAdmin - Unauthorized (not an admin user)'
      })
    })
  })

  describe('src > v1 > presentation > middlewares > loggedUser > isAuthorized', () => {
    it('Should successfully pass authorization with valid token', () => {
      // Arrange
      const mockUser = { id: 1, role: 'admin', email: 'test@example.com' } as loggedUser
      const mockToken = 'valid.jwt.token'

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        },
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()
      
      // Mock jwt.verify to return mockUser
      vi.mocked(jwt.verify).mockImplementation(() => mockUser)

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(jwt.verify).toHaveBeenCalledTimes(1)
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET_KEY || 'secret')
      expect(nextFunction).toHaveBeenCalledTimes(1)
      expect(statusFn).not.toHaveBeenCalled()
      // Verify user was added to request body
      expect(mockRequest.body.user).toEqual(mockUser)
    })

    it('Should fail authorization when no token is provided', () => {
      // Arrange
      const mockRequest = {
        headers: {},
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledTimes(1)
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'presentation:middleware:isAuthorized, failed to get a valid token'
      })
    })

    it('Should fail authorization when token is expired', () => {
      // Arrange
      const mockToken = 'expired.jwt.token'
      const expiredAt = new Date()

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        },
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Stub jwt.verify to throw TokenExpiredError
      const tokenExpiredError = new jwt.TokenExpiredError('Token expired', expiredAt)
      vi.mocked(jwt.verify).mockImplementation(() => { throw tokenExpiredError })

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(jwt.verify).toHaveBeenCalledTimes(1)
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledTimes(1)
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'presentation:middleware:isAuthorized - Token expired',
        expiredAt: expiredAt
      })
      expect(logger.info).toHaveBeenCalledTimes(1)
    })

    it('Should fail authorization when token is invalid', () => {
      // Arrange
      const mockToken = 'invalid.jwt.token'

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        },
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Stub jwt.verify to throw JsonWebTokenError
      const jsonWebTokenError = new jwt.JsonWebTokenError('Invalid token')
      vi.mocked(jwt.verify).mockImplementation(() => { throw jsonWebTokenError })

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(jwt.verify).toHaveBeenCalledTimes(1)
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledTimes(1)
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'presentation:middleware:isAuthorized - Invalid token',
        error: 'Invalid token'
      })
      expect(logger.info).toHaveBeenCalledTimes(1)
    })

    it('Should fail authorization with unexpected error', () => {
      // Arrange
      const mockToken = 'valid.jwt.token'

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        },
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Stub jwt.verify to throw generic error
      vi.mocked(jwt.verify).mockImplementation(() => { throw new Error('Unexpected error') })

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(jwt.verify).toHaveBeenCalledTimes(1)
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledTimes(1)
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'presentation:middleware:isAuthorized - Authentication failed'
      })
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('Should fail authorization when authorization header has invalid format', () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormatWithoutBearer'
        },
        body: {}
      } as unknown as Request

      const jsonFn = vi.fn()
      const statusFn = vi.fn().mockReturnValue({ json: jsonFn })
      const mockResponse = {
        status: statusFn
      } as unknown as Response

      const nextFunction = vi.fn()

      // Act
      isAuthorized(mockRequest, mockResponse, nextFunction)

      // Assert
      expect(nextFunction).not.toHaveBeenCalled()
      expect(statusFn).toHaveBeenCalledTimes(1)
      expect(statusFn).toHaveBeenCalledWith(401)
      expect(jsonFn).toHaveBeenCalledTimes(1)
      expect(jsonFn).toHaveBeenCalledWith({
        message: 'presentation:middleware:isAuthorized, failed to get a valid token'
      })
    })
  })
})
