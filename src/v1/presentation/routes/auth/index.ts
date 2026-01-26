import { Router } from 'express'
import { isValidRefreshToken } from '../../middlewares/auth/isValidRefreshToken.js'
import { getTokenController, logoutController, refreshTokenController } from '../../controllers/auth/index.js'

const authRouter = Router()

authRouter.route('/getToken').post(getTokenController)

authRouter.route('/logout').post(logoutController)

authRouter.route('/refreshToken').post(isValidRefreshToken, refreshTokenController)

export default authRouter
