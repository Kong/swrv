import SWRVCache, { ICacheItem } from '..'
import { IKey } from '../../types'

/**
 * LocalStorage cache adapter for swrv data cache.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 */

interface IStore { [name: string]: ICacheItem<any> }

export default class LocalStorageCache extends SWRVCache<any> {
  private STORAGE_KEY

  constructor (key: string = 'swrv', ttl: number = 0) {
    super(ttl)
    this.STORAGE_KEY = key
    this.rescheduleExpiry()
  }

  getLocalStorageContents(): IStore {
    const item = localStorage.getItem(this.STORAGE_KEY)
    if (item) return this.decode(item)
    else return {}
  }

  setLocalStorageContents(value: IStore) {
    const encoded = this.encode(value)
    try {
      localStorage.setItem(this.STORAGE_KEY, encoded)
    }
    catch {
      // If there's been an error, it's probably because localStorage is full or disabled (e.g. some private browsing)
      // eslint-disable-next-line no-console
      console.log("Unable to store SWRV data in LocalStorage, maybe full?")

      // Try to clear SWRV's data.
      try {
        // Clear the cache for next time.
        localStorage.removeItem(this.STORAGE_KEY)
      }
      catch {
        // Don't try to recover, fail silently.
        // eslint-disable-next-line no-console
        console.log("Unable to clear SWRV data in LocalStorage.")
      }
    }
  }

  get (k: IKey) {
    const store = this.getLocalStorageContents()
    const _key = this.serializeKey(k)
    const itemParsed: ICacheItem<any> = store[_key]

    if (itemParsed?.expiresAt === null) {
      itemParsed.expiresAt = Infinity // localStorage sets Infinity to 'null'
    }

    return itemParsed
  }

  set (k: string, v: any, ttl: number) {
    const _key = this.serializeKey(k)
    const timeToLive = ttl || this.ttl
    const store = this.getLocalStorageContents()
    const now = Date.now()
    const item: ICacheItem<any> = {
      data: v,
      createdAt: now,
      expiresAt: timeToLive ? now + timeToLive : Infinity
    }

    store[_key] = item

    this.dispatchExpire(timeToLive, item, _key)
    this.setLocalStorageContents(store)
  }

  dispatchExpire (ttl: number, item: ICacheItem<any>, serializedKey: string) {
    ttl && setTimeout(() => {
      const current = Date.now()
      const hasExpired = current >= item.expiresAt
      if (hasExpired) this.delete(serializedKey)
    }, ttl)
  }

  rescheduleExpiry() {
    const store = this.getLocalStorageContents()
    for (const [serializedKey, item] of Object.entries(store)) {
      if (item.expiresAt !== Infinity) {
        let ttl = item.expiresAt - Date.now()
        if (ttl < 0) ttl = 1;
        this.dispatchExpire(ttl, item, serializedKey)
      }
    }
  }

  delete (serializedKey: string) {
    const store = this.getLocalStorageContents()
    delete store[serializedKey]
    this.setLocalStorageContents(store)
  }

  private encode (storage: object) { return JSON.stringify(storage) }

  private decode (storage: string) { return JSON.parse(storage) }
}
