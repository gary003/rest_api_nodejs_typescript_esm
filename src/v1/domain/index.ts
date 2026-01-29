export const moneyTypes = {
  HARD_CURRENCY: 'hardCurrency',
  SOFT_CURRENCY: 'softCurrency'
} as const

export const moneyTypesDB = {
  HARD_CURRENCY: 'hard_currency',
  SOFT_CURRENCY: 'soft_currency'
} as const

export type moneyTypes = (typeof moneyTypes)[keyof typeof moneyTypes]
export type moneyTypesDB = (typeof moneyTypesDB)[keyof typeof moneyTypesDB]

/**
 * Helper to convert camelCase domain currency to snake_case database currency.
 * Avoids the need for a large mapping object while maintaining type safety.
 */
export const toDBMoneyType = (type: moneyTypes): moneyTypesDB => {
  return (type === 'hardCurrency' ? 'hard_currency' : 'soft_currency') as moneyTypesDB
}
