export const DB_TO_DTO_MONEY_MAP = {
  hard_currency: 'hardCurrency',
  soft_currency: 'softCurrency'
} as const

export const DTO_TO_DB_MONEY_MAP = {
  hardCurrency: 'hard_currency',
  softCurrency: 'soft_currency'
} as const

export type moneyTypes = keyof typeof DB_TO_DTO_MONEY_MAP
