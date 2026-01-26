import { trace, Span, Tracer, SpanOptions } from '@opentelemetry/api'
import { Request, Response } from 'express'
import { Readable } from 'stream'
import { errorAPIUSER } from './error.dto.js'
import { userWalletDTO } from '../../../services/user/dto.js'
import { apiResponseGetAllUserType, apiResponseGetUserType, apiResponseCreateUserType, apiResponseDeleteUserType } from './apiResponse.dto.js'
import { deleteUserById, getAllUsers, getAllUsersStream, getUserWalletInfo, saveNewUser, transferMoney } from '../../../services/user/index.js'
import { moneyTypes, DB_TO_DTO_MONEY_MAP } from '../../../domain/index.js'
import { logger } from '../../../helpers/logger/index.js'

export const getAllUsersController = async (_: Request, res: Response) => {
  const tracer: Tracer = trace.getTracer('route-user')
  const spanOptions: SpanOptions = {
    startTime: Date.now()
  }

  return tracer.startActiveSpan('getAllUsers', spanOptions, async (span: Span) => {
    // Add attributes (tags) to the span
    try {
      span.setAttribute('http.route', '/users')

      const { traceId, ...rest } = span.spanContext()
      logger.debug(`presentation:routes:getAllUsers - traceId : ${traceId} - context : ${JSON.stringify(rest, null, 2)}`)

      const results = await getAllUsers().catch((err: unknown) => err)

      if (results instanceof Error) {
        const errInfo = `presentationError: ${errorAPIUSER.errorAPIGetAllUsers.message} \n ${String(results)}`
        logger.error(errInfo)
        return res.status(500).end(errInfo)
      }

      const apiRes: apiResponseGetAllUserType = { data: results as userWalletDTO[] }

      span.end()
      return res.status(200).json(apiRes)
    } catch (err) {
      if (err instanceof Error) span.recordException(String(err))
      span.end()
      const errInfo: string = `presentation:routes:getAllUsers - Internal Server Error - ${err}`
      return res.status(500).send(errInfo)
    }
  })
}

export const createUserController = async (req: Request, res: Response) => {
  const { firstname, lastname } = req.body

  const result = await saveNewUser(firstname, lastname).catch((err) => {
    logger.error(err)
    return err
  })

  if (result instanceof Error) {
    const errInfo = `presentationError: ${errorAPIUSER.errorAPIUserCreation?.message} \n ${result.message}`
    return res.status(500).send(errInfo)
  }

  const response: apiResponseCreateUserType = { data: result }

  return res.status(200).json(response)
}

export const transferMoneyController = async (req: Request, res: Response) => {
  const { senderId, receiverId, amount, currency } = req.body

  // Validate required fields
  if (!senderId || !receiverId || !amount || !currency) {
    return res.status(400).json(errorAPIUSER.errorAPIUserTransfertWrongParams)
  }

  // Validate amount is a positive number
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json(errorAPIUSER.errorAPIUserTransferIllegalAmount)
  }

  if (senderId === receiverId) {
    return res.status(400).json(errorAPIUSER.errorAPIUserTransferSelf)
  }

  if (!(currency in DB_TO_DTO_MONEY_MAP)) {
    return res.status(400).json(errorAPIUSER.errorAPIUserTransfertWrongParams)
  }

  // Call the transferMoney service
  const result = await transferMoney(currency as moneyTypes, senderId, receiverId, amount).catch((err) => {
    logger.error(err)
    return err
  })

  if (result instanceof Error) {
    const errInfo = `presentationError: ${errorAPIUSER.errorAPIUserTransferNoResults?.message} \n ${result.message}`
    return res.status(500).send(errInfo)
  }

  const response = { data: result }

  return res.status(200).json(response)
}

export const getUsersStreamController = async (_: Request, res: Response) => {
  const usersStream = await getAllUsersStream().catch((err: unknown) => err)

  if (usersStream instanceof Error) {
    const errInfo = `presentationError: ${errorAPIUSER.errorAPIGetAllUsers?.message} \n ${usersStream.message}`
    return res.status(500).send(errInfo)
  }

  // usersStream.on('data', (d: any) => logger.debug(d))
  return (usersStream as Readable).pipe(res)
}

export const getUserByIdController = async (req: Request, res: Response) => {
  const result = await getUserWalletInfo(String(req.params.userId)).catch((err) => err)

  if (result instanceof Error) {
    const errInfo = `presentationError: ${errorAPIUSER.errorAPIGetUser.message} \n ${result.message}`
    return res.status(500).send(errInfo)
  }

  return res.status(200).json({ data: result } as apiResponseGetUserType)
}

export const deleteUserByIdController = async (req: Request, res: Response) => {
  const result = await deleteUserById(String(req.params.userId)).catch((err) => err)

  if (result instanceof Error) {
    const errInfo = `presentationError: ${errorAPIUSER.errorAPIDeleteUser?.message} \n ${result.message}`
    return res.status(500).send(errInfo)
  }

  return res.status(200).json({ data: result } as apiResponseDeleteUserType)
}
