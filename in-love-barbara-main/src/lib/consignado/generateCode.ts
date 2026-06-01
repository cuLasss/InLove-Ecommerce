// Sistema local - não precisa de Supabase
export async function generateConsignacaoCode(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Sistema local - gerar código mock
  const randomNum = Math.floor(Math.random() * 10000)
  return `CONS-${currentYear}-${String(randomNum).padStart(4, '0')}`
}
