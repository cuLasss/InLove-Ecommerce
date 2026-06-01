// Sanitized demo data for local development and public builds.
// Do not replace these files with real client, fiscal or sales data in public repositories.

export { default as categories } from './categories.json'
export { default as products } from './products.json'
export { default as clients } from './clients.json'
export { default as users } from './users.json'
export { default as sales } from './sales.json'
export { default as sale_items } from './sale_items.json'
export { default as consignacoes } from './consignacoes.json'
export { default as consignacao_items } from './consignacao_items.json'
export { default as payments } from './payments.json'
export { default as consign_payments } from './consign_payments.json'
export { default as cashier_shifts } from './cashier_shifts.json'
export { default as nfe_imports } from './nfe_imports.json'
export { default as nfe_items } from './nfe_items.json'
export { default as scan_nonces } from './scan_nonces.json'

export const dataStats = {
  categories: 2,
  products: 2,
  clients: 2,
  users: 2,
  sales: 2,
  sale_items: 2,
  consignacoes: 1,
  consignacao_items: 1,
  payments: 1,
  consign_payments: 0,
  cashier_shifts: 0,
  nfe_imports: 0,
  nfe_items: 0,
  scan_nonces: 0
}

export const lastRestored = null
export const onlyRealData = false
export const basedOnRealData = false

export function getAllRealData() {
  return {
    categories,
    products,
    clients,
    users,
    sales,
    sale_items,
    consignacoes,
    consignacao_items,
    payments,
    consign_payments,
    cashier_shifts,
    nfe_imports,
    nfe_items,
    scan_nonces
  }
}
