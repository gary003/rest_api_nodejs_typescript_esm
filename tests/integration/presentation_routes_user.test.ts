import { describe, it, afterAll, expect, beforeEach } from 'vitest'
import { errorAPIUSER } from '../../src/v1/presentation/routes/user/error.dto.js'
import { moneyTypesO } from '../../src/v1/domain/index.js'
import jwt from 'jsonwebtoken'
import { getDockerTestEnvVariables, getTestUrls } from '../vitest.setup.js'

describe('Integration tests - presentation:routes:user', () => {
  const originalEnv = { ...process.env } as const

  // Dont accidentally fetch the real database (use the containerized test environment) !
  process.env.DB_URI = ''
  process.env.DB_HOST = ''

  // Test environment variables from vitest.setup.ts to use in the tests
  const test_env = getDockerTestEnvVariables()

  // Modify the current environment variables with the test environment variables
  // The db needs the env variables to create the uri
  process.env = {...process.env, ...test_env}

  // This is test user ids  use through all tests (as recipient and giver for money transfer tests)
  let testUserId1: string = ''
  let testUserId2: string = ''

  const urlBase: string = 'api'

  // Use the environment variables set in vitest.setup.ts to get the db uri
  const { appUrl, dbUriTest } = getTestUrls()
    
  // Set DB connection params to containerized test environment
  process.env.DB_URI = dbUriTest

  beforeEach(() => {
  })

  afterAll(async () => {
    process.env = originalEnv
  })

  describe('src > v1 > presentation > routes > user > GET (getting all the users)', () => {
    it('Should get all users from DB', async () => {
      const response = await fetch(`${appUrl}/${urlBase}/user/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const body = await response.json()

      // This user will be used through the whole file
      testUserId2 = body.data[1].userId

      expect(response.status).to.be.within(200, 299)
      expect(body.data).to.be.an('array')
      expect(body.data).length.above(0)
    })
  })

  describe('src > v1 > presentation > routes > user > stream > GET (getting all the users - stream)', () => {
    it('Should get all users from DB from a stream', async () => {
      const resp = await fetch(`${appUrl}/${urlBase}/user/stream`)

      if (resp instanceof Error) expect.fail('Error - Impossible to get the data stream from route')

      const text = await resp.text()

      const users = text.split('\n').filter(line => line.trim() !== '')

      expect(resp.status).to.be.within(200, 299)
      expect(users).to.be.an('array')

      for (const chunk of users) {
        const user = JSON.parse(chunk)
        expect(user).to.have.property('userId')
        expect(user).to.have.property('firstname')
        expect(user).to.have.property('Wallet')
      }
    })
  })

  describe('src > v1 > presentation > routes > user > POST (adding a new user)', () => {
    it('should add a new user', async () => {
      const newUser = {
        firstname: 'test_Rosita',
        lastname: 'test_Espinosa'
      }

      const response = await fetch(`${appUrl}/${urlBase}/user/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      })

      const body = await response.json()

      // Get the user id from DB response in addUser
      testUserId1 = body.data.userId

      // logger.debug(JSON.stringify(body))
      expect(response.status).to.be.within(200, 299)

      expect(body.data).to.not.be.empty
      expect(body.data.firstname).to.be.not.empty
      expect(body.data.firstname).to.equal(newUser.firstname)
      expect(body.data.lastname).to.equal(newUser.lastname)
    })
  })

  describe('src > v1 > presentation > routes > user > GET (single user)', () => {
    it('should return a single user', async () => {
      const response = await fetch(`${appUrl}/${urlBase}/user/${testUserId1}`)


      const body = await response.json()


      expect(response.status).to.be.within(200, 299)
      expect(body.data).to.have.property('userId')
    })
    it('should fail returning a single user ( wrong parameter in route )', async () => {
      const wrongUserId = 123

      const response = await fetch(`${appUrl}/${urlBase}/user/${String(wrongUserId)}`)

      const body = await response.json()

      expect(response.status).to.be.within(400, 499)
      expect(body).to.have.property('middlewareError')
    })
    it('should fail returning a single user ( user dont exists )', async () => {
      const nonExistentUserId = '00000000-0000-4000-a000-000000000000'

      const response = await fetch(`${appUrl}/${urlBase}/user/${nonExistentUserId}`)

      const text = await response.text()
      expect(response.status).to.be.within(500, 599)
      expect(text).to.include('Impossible to get any')
    })
  })

  describe('src > v1 > presentation > routes > user > POST (transfer)', () => {
    it('should successfully transfer money between users', async () => {
      const validTransferData = {
        senderId: testUserId2,
        receiverId: testUserId1,
        amount: 7,
        currency: moneyTypesO.hard_currency
      }

      const urlToFetch = `${appUrl}/${urlBase}/user/transfer`
      const response = await fetch(urlToFetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validTransferData),
      })
      
      const body = await response.json()

      expect(response.status).to.be.within(200, 299)
      expect(body).to.have.property('data')
    })

    it('should fail transferring money (missing required fields)', async () => {
      const invalidData = {
        senderId: testUserId1
        // missing other required fields
      }

      const urlToFetch = `${appUrl}/${urlBase}/user/transfer`
      const response = await fetch(urlToFetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const body = await response.json()

      expect(response.status).to.be.within(400, 499)
      expect(body).to.deep.equal(errorAPIUSER.errorAPIUserTransfertWrongParams)
    })

    it('should fail transferring money (illegal amount)', async () => {
      const validTransferData = {
        senderId: testUserId2,
        receiverId: testUserId1,
        amount: 101,
        currency: moneyTypesO.hard_currency
      }

      const invalidData = {
        ...validTransferData,
        amount: -100
      }

      const urlToFetch = `${appUrl}/${urlBase}/user/transfer`
      const response = await fetch(urlToFetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      })

      const body = await response.json()

      expect(response.status).to.be.within(400, 499)
      expect(body).to.deep.equal(errorAPIUSER.errorAPIUserTransferIllegalAmount)
    })

    it('Should fail transferring money (senderId === receiverId)', async () => {
      const invalidTransferData = {
        senderId: testUserId1,
        receiverId: testUserId1,
        amount: 10,
        currency: moneyTypesO.hard_currency
      }

      const urlToFetch = `${appUrl}/${urlBase}/user/transfer`
      const response = await fetch(urlToFetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidTransferData),
      })

      const body = await response.json()

      expect(response.status).to.be.within(400, 499)
      expect(body).to.deep.equal(errorAPIUSER.errorAPIUserTransferSelf!)
    })

    it('should fail transferring money (non-existent sender)', async () => {
      const nonExistentSenderId = '00000000-0000-4000-a000-000000000000'
      const invalidTransferData = {
        senderId: nonExistentSenderId,
        receiverId: testUserId1,
        amount: 10,
        currency: moneyTypesO.hard_currency
      }

      const urlToFetch = `${appUrl}/${urlBase}/user/transfer`
      const response = await fetch(urlToFetch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidTransferData),
      })

      expect(response.status).to.be.within(500, 599)
    })
  })

  describe('src > v1 > presentation > routes > user > DELETE', () => {
    it('should fail deleting a specified user (logged user is not an admin)', async () => {
      // Create an admin token for authentication
      const stdUser = {
        id: 1,
        email: 'user213@test.com',
        name: 'user#213',
        role: 'standard'
      }

      const token = jwt.sign(stdUser, process.env.JWT_SECRET_KEY || 'secret', { expiresIn: 30 })

      const urlToFetch = `${appUrl}/${urlBase}/user/${testUserId1}`
      const response = await fetch(urlToFetch, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      // logger.debug(JSON.stringify(response))

      expect(response.status).to.be.within(400, 499)
    })

    it('should delete a specified user (logged user is admin)', async () => {
      // Create an admin token for authentication
      const adminUser = {
        id: 1,
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin'
      }

      const token = jwt.sign(adminUser, process.env.JWT_SECRET_KEY || 'secret', { expiresIn: 30 })

      const urlToFetch = `${appUrl}/${urlBase}/user/${testUserId1}`
      const response = await fetch(urlToFetch, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const text = await response.text()
      expect(response.status).to.be.within(200, 299)
      expect(text).to.not.be.null
      expect(response.ok).to.be.equal(true)
    })
  })
})
