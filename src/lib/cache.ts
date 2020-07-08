interface ICacheItem {
  data: any,
  createdAt: number,
  expiresAt: number
}

export default class SWRVCache {
  private ttl: number
  private items: Map<string, ICacheItem>

  constructor (ttl = 0) {
    this.items = new Map()
    this.ttl = ttl
  }

  /**
   * Get cache item while evicting
   */
  get (k: string): ICacheItem {
    return this.items.get(k)
  }

  set (k: string, v: any, ttl: number) {
    const timeToLive = ttl || this.ttl
    const now = Date.now()
    const item = {
      data: v,
      createdAt: now,
      expiresAt: timeToLive ? now + timeToLive : Infinity
    }

    timeToLive && setTimeout(() => {
      const current = Date.now()
      const hasExpired = current >= item.expiresAt
      if (hasExpired) this.delete(k)
    }, timeToLive)

    this.items.set(k, item)
  }

  delete (k: string) {
    this.items.delete(k)
  }
}
