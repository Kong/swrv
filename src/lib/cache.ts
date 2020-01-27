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

  get (k: string, ttl: number): any {
    this.shift(ttl)
    return this.items.get(k) && this.items.get(k).data
  }

  set (k: string, v: any) {
    const item: ICacheItem = {
      data: v,
      createdAt: Date.now()
    }

    this.items.set(k, item)
  }

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

  delete (k: string) {
    this.items.delete(k)
  }
}
