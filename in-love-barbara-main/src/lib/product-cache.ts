/**
 * Cache simples para produtos - melhora performance
 */
class ProductCache {
  private cache = new Map<string, { data: any[], timestamp: number }>()
  private readonly CACHE_DURATION = 30 * 1000 // 30 segundos

  set(key: string, data: any[]) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  get(key: string): any[] | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear() {
    this.cache.clear()
  }
}

export const productCache = new ProductCache()
