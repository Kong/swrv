interface ICacheItem {
  data: any,
  createdAt: number
}

export default class SWRCache {
  private ttl: number
  private items: Map<string, ICacheItem>

  constructor (ttl = 0) {
    this.items = new Map()
    this.ttl = ttl
  }

  /**
   * Get cache item while evicting
   */
  get (k: string, ttl: number): ICacheItem {
    this.shift(ttl)
    return this.items.get(k)
  }

  set (k: string, v: any) {
    const item: ICacheItem = {
      data: v,
      createdAt: Date.now()
    }

    this.items.set(k, item)
  }

  delete (k: string) {
    this.items.delete(k)
  }

  /**
   * Eviction of cache items based on some ttl of ICacheItem.createdAt
   */
  private shift (ttl: number) {
    const timeToLive = ttl || this.ttl
    if (!timeToLive) {
      return
    }

    this.items.forEach((v, k) => {
      if (v.createdAt < Date.now() - timeToLive) {
        this.items.delete(k)
      }
    })
  }
}
