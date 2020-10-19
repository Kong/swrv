import { IKey } from '@/types'
import hash from './hash'

interface ICacheItem {
  data: any,
  createdAt: number,
  expiresAt: number
}

function serializeKeyDefault (key: IKey): string {
  if (typeof key === 'function') {
    try {
      key = key()
    } catch (err) {
      // dependencies not ready
      key = ''
    }
  }

  if (Array.isArray(key)) {
    key = hash(key)
  } else {
    // convert null to ''
    key = String(key || '')
  }

  return key
}

export default class SWRVCache {
  private ttl: number
  private items: Map<string, ICacheItem>

  constructor (ttl = 0) {
    this.items = new Map()
    this.ttl = ttl
  }

  serializeKey (key: IKey): string {
    return serializeKeyDefault(key)
  }

  /**
   * Get cache item while evicting
   */
  get (k: string): ICacheItem {
    const _key = this.serializeKey(k)
    return this.items.get(_key)
  }

  set (k: string, v: any, ttl: number) {
    const _key = this.serializeKey(k)
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
      if (hasExpired) this.delete(_key)
    }, timeToLive)

    this.items.set(_key, item)
  }

  delete (k: string) {
    const _key = this.serializeKey(k)
    this.items.delete(_key)
  }
}
