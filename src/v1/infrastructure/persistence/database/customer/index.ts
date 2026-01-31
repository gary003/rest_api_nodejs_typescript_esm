import { Customer } from './entity.js'
import { Wallet } from '../wallet/entity.js'
import { createAndStartTransaction, getConnection } from '../db_connection/connectionFile.js'
import { createNewWalletDB, deleteWalletByIdDBTransaction } from '../wallet/index.js'
import { customerWalletFromTableDB } from './customerWalletDB.dto.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../../../helpers/logger/index.js'

// Get all customers with their wallets from the database
export const getAllCustomersDB = async (): Promise<customerWalletFromTableDB[]> => {
  const connection = await getConnection() // Get DB connection
  const CustomerRepository = connection.getRepository(Customer) // Get Customer repository

  // Query to fetch all customers with their wallets
  const result = await CustomerRepository.createQueryBuilder('customer')
    .innerJoinAndMapOne('customer.Wallet', Wallet, 'wallet', 'wallet.customer_id = customer.customer_id')
    .getMany()
    .catch((err) => err)

  // Handle errors during query execution
  if (result instanceof Error) {
    const errorMessage = `Impossible to retrieve any customer - ${String(result)}`
    logger.error(errorMessage)
    throw new Error(errorMessage)
  }

  // Create result customers with wallets
  const customersResults = result.map((chunk: customerWalletFromTableDB) => {
    return chunk
  })

  return customersResults
}

// Get all customers as a stream for efficient handling of large datasets
export const getAllCustomersStreamDB = async () => {
  const connection = await getConnection() // Get DB connection
  const CustomerRepository = connection.getRepository(Customer) // Get Customer repository

  // Query to stream customers with their wallets
  const customerStream = await CustomerRepository.createQueryBuilder('customer')
    .innerJoinAndMapOne('customer.Wallet', Wallet, 'wallet', 'wallet.customer_id = customer.customer_id')
    .stream()

  return customerStream
}

// Save a new customer to the database and create a wallet for them
export const saveNewCustomerDB = async (firstname: string, lastname: string) => {
  const newCustomer = new Customer() // Create new customer entity
  newCustomer.customer_id = uuidv4() // Generate unique ID
  newCustomer.firstname = firstname
  newCustomer.lastname = lastname

  // Create a wallet for the new customer
  const walletCreation = await createNewWalletDB(newCustomer).catch((err) => err)

  // Handle wallet creation errors
  if (walletCreation instanceof Error) {
    logger.error(walletCreation)
    throw new Error(`Impossible to create a new wallet or customer - ${String(walletCreation)}`)
  }

  return { newCustomer, walletCreation } // Return the new customer
}

// Delete a customer and their associated wallet from the database
export const deleteCustomerByIdDB = async (customerId: string): Promise<boolean> => {
  // Step 1: Get customer info
  const customerToDeleteInfo = await getCustomerWalletInfoDB(customerId).catch((err) => err)

  // Handle errors during customer info retrieval
  if (customerToDeleteInfo instanceof Error) {
    logger.error(customerToDeleteInfo)
    throw new Error(`Impossible to delete the customer in DB, no customer info available (step 1) - ${String(customerToDeleteInfo)}`)
  }

  // Start a transaction
  const queryRunner = await createAndStartTransaction()

  try {
    // Step 2: Delete the wallet if it exists
    if (customerToDeleteInfo.Wallet) {
      const walletDeletion = await deleteWalletByIdDBTransaction(queryRunner, String(customerToDeleteInfo.Wallet.wallet_id)).catch((err) => err)

      // Handle wallet deletion errors
      if (walletDeletion instanceof Error) {
        logger.error(walletDeletion)
        throw new Error(`Impossible to delete the customer in DB (step 2) - ${walletDeletion.message}`)
      }
    }

    // Step 3: Delete the customer
    const CustomerRepository = queryRunner.manager.getRepository(Customer)
    const deletedCustomer = await CustomerRepository.delete(customerId).catch((err) => err)

    // Handle customer deletion errors
    if (deletedCustomer instanceof Error) {
      logger.error(deletedCustomer)
      throw new Error(`Impossible to delete the customer in DB (step 3) - ${deletedCustomer.message}`)
    }

    if (deletedCustomer.affected === 0) {
      logger.error(deletedCustomer)
      throw new Error('Impossible to delete the customer in DB (step 3) - no row affected')
    }

    // Commit the transaction
    await queryRunner.commitTransaction()
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    // Release the query runner
    await queryRunner.release()
  }

  return true // Return success
}

// Get a customer's wallet info by their ID
export const getCustomerWalletInfoDB = async (customerId: string) => {
  const connection = await getConnection() // Get DB connection
  const CustomerRepository = connection.getRepository(Customer) // Get Customer repository

  // Query to fetch customer's wallet info
  const customerWalletInfo = await CustomerRepository.createQueryBuilder('customer')
    .innerJoinAndMapOne('customer.Wallet', Wallet, 'wallet', 'wallet.customer_id = customer.customer_id')
    .where('customer.customer_id = :customerId', { customerId: customerId })
    .getOne()
    .catch((err) => err)

  // Handle query errors
  if (customerWalletInfo instanceof Error) {
    logger.error(customerWalletInfo)
    throw new Error(`Impossible to get the customer info - ${customerWalletInfo.message}`)
  }

  // Handle case where customer doesn't exist
  if (customerWalletInfo == null) {
    throw new Error('Impossible to get any customer with that ID (response is null - customer doesnt exist)')
  }

  return customerWalletInfo // Return customer's wallet info
}
