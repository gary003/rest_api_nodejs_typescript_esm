import redisClient, { connectRedis } from '../../infrastructure/persistence/redis/index.js'
import logger from '../../helpers/logger/index.js'

const getRedisKey = (token: string) => `refresh_token:${token}`

export const storeRefreshToken = async (token: string, userId: string): Promise<void> => {
  try {
    await connectRedis()
    // Store token with 1 day expiration (86400 seconds)
    await redisClient.set(getRedisKey(token), userId, { EX: 86400 })
  } catch (err) {
    logger.error(`AuthService:storeRefreshToken - ${err}`)
    throw new Error('Failed to store refresh token')
  }
}

export const isTokenValid = async (token: string): Promise<boolean> => {
  try {
    await connectRedis()
    const userId = await redisClient.get(getRedisKey(token))
    return !!userId
  } catch (err) {
    logger.error(`AuthService:isTokenValid - ${err}`)
    return false
  }
}

export const revokeToken = async (token: string): Promise<void> => {
  try {
    await connectRedis()
    await redisClient.del(getRedisKey(token))
  } catch (err) {
    logger.error(`AuthService:revokeToken - ${err}`)
    throw new Error('Failed to revoke token')
  }
}
