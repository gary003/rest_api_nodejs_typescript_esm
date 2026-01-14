import { tryToConnectDB } from '../../db_connection/connector.js'
import { Customer } from '../../customer/entity.js'
import { Wallet } from '../../wallet/entity.js'
import path from 'path'
import logger from '../../../../../helpers/logger/index.js'

// Mock environment variables
process.env.DB_DRIVER = 'sqlite'
process.env.DB_DATABASE_NAME = path.resolve(process.cwd(), 'src/v1/infrastructure/persistence/database/db_test_development/db_file_volume/sqlite.db')

const customers = [
  { customer_id: '37ab5564-0234-11ed-b939-0242ac120050', firstname: 'Sasha', lastname: 'Williams' },
  { customer_id: '18ab5564-0234-11ed-b939-0242ac120059', firstname: 'Tara', lastname: 'Chambler' },
  { customer_id: '99ab5564-0234-11ed-b939-0242ac120080', firstname: 'Daryl', lastname: 'Dixon' },
  { customer_id: '12dc5564-0234-11ed-b939-0242ac120099', firstname: 'Shane', lastname: 'Gill' },
  { customer_id: '87dc5564-0234-11ed-b939-0242ac120045', firstname: 'Yumiko', lastname: 'Yamagami' },
  { customer_id: '22ef5564-0234-11ed-b939-0242ac120002', firstname: 'Carol', lastname: 'Peletier' },
  { customer_id: '35269564-0234-11ed-b939-0242ac120002', firstname: 'Beth', lastname: 'Greene' },
  { customer_id: '14523564-0234-11ed-b939-0242ac120002', firstname: 'Glen', lastname: 'Rhee' },
  { customer_id: '68965564-0234-11ed-b939-0242ac120002', firstname: 'Rick', lastname: 'Grimes' }
]

const wallets = [
  { wallet_id: '17ab5564-0234-11ed-b939-0242ac120044', customer_id: '37ab5564-0234-11ed-b939-0242ac120050', hard_currency: 1000, soft_currency: 1240 },
  { wallet_id: '97ab5564-0234-11ed-b939-0242ac120087', customer_id: '18ab5564-0234-11ed-b939-0242ac120059', hard_currency: 1000, soft_currency: 1240 },
  { wallet_id: '515f73c2-027d-11ed-b939-0242ac120002', customer_id: '99ab5564-0234-11ed-b939-0242ac120080', hard_currency: 1000, soft_currency: 1240 },
  { wallet_id: '698f73c2-027d-11ed-b939-0242ac120002', customer_id: '12dc5564-0234-11ed-b939-0242ac120099', hard_currency: 250, soft_currency: 450 },
  { wallet_id: '412cddd2-027d-11ed-b939-0242ac120002', customer_id: '87dc5564-0234-11ed-b939-0242ac120045', hard_currency: 850, soft_currency: 750 },
  { wallet_id: '12dc5564-0234-11ed-b939-0242ac120099', customer_id: '22ef5564-0234-11ed-b939-0242ac120002', hard_currency: 1000, soft_currency: 1240 },
  { wallet_id: '56ec5564-0234-11ed-b939-0242ac120099', customer_id: '35269564-0234-11ed-b939-0242ac120002', hard_currency: 250, soft_currency: 450 },
  { wallet_id: '76fc5564-0234-11ed-b939-0242ac120099', customer_id: '14523564-0234-11ed-b939-0242ac120002', hard_currency: 850, soft_currency: 750 },
  { wallet_id: '99fc5564-0234-11ed-b939-0242ac120099', customer_id: '68965564-0234-11ed-b939-0242ac120002', hard_currency: 850, soft_currency: 750 }
]

const seed = async () => {
  logger.info('Starting seed process...')
  logger.info('DB Path:', process.env.DB_DATABASE_NAME)

  try {
    const connection = await tryToConnectDB()
    logger.info('Connected to DB.')

    logger.info('Synchronizing schema (dropping existing tables)...')
    await connection.synchronize(true)
    logger.info('Schema synchronized.')

    const customerRepo = connection.getRepository(Customer)
    const walletRepo = connection.getRepository(Wallet)

    logger.info('Seeding customers...')
    for (const customerData of customers) {
      const customer = customerRepo.create(customerData)
      await customerRepo.save(customer)
    }
    logger.info(`Seeded ${customers.length} customers.`)

    logger.info('Seeding wallets...')

    for (const walletData of wallets) {
      const wallet = walletRepo.create({
        wallet_id: walletData.wallet_id,
        hard_currency: walletData.hard_currency,
        soft_currency: walletData.soft_currency,
        customer: { customer_id: walletData.customer_id } as Customer
      })
      await walletRepo.save(wallet)
    }
    logger.info(`Seeded ${wallets.length} wallets.`)

    await connection.destroy()
    logger.info('Seed process completed successfully.')
  } catch (error) {
    logger.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
