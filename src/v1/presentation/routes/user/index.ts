import { Router } from 'express'
import { isValidUserId } from '../../middlewares/user/isValidUserId.js'
import { isAuthorized } from '../../middlewares/auth/isAuthorized.js'
import { isAdmin } from '../../middlewares/auth/isAdmin.js'
import {
  createUserController,
  deleteUserByIdController,
  getAllUsersController,
  getUsersStreamController,
  getUserByIdController,
  transferMoneyController
} from '../../controllers/user/index.js'

const userRouter = Router()

userRouter.route('/').get(getAllUsersController).post(createUserController)

userRouter.route('/transfer').post(transferMoneyController)

userRouter.route('/stream').get(getUsersStreamController)

userRouter.route('/:userId').get(isValidUserId, getUserByIdController).delete(isAuthorized, isAdmin, isValidUserId, deleteUserByIdController)

export default userRouter
