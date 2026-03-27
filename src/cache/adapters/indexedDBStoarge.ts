import SWRVCache, { ICacheItem } from '..'
import { get, set, createStore, del } from 'idb-keyval'
// why use idb-keyval
// This is a super-simple promise-based keyval store implemented with IndexedDB, originally based on async-storage by Mozilla.
// It's small and tree-shakeable. If you only use get/set, the library is ~250 bytes (brotli'd), if you use all methods it's ~534 bytes.
// localForage offers similar functionality, but supports older browsers with broken/absent IDB implementations. Because of that, it's orders of magnitude bigger (~7k).
// This is only a keyval store. If you need to do more complex things like iteration & indexing, check out IDB on NPM (a little heavier at 1k). The first example in its README is how to create a keyval store.
// star num is 750,457 / week
/**
 * IndexedDB cache adapter for swrv data cache.
 * https://developer.mozilla.org/zh-CN/docs/Web/API/Window/indexedDB
 */

export default class IndexedDBStoargeCache extends SWRVCache<any> {
  protected db = null;
  protected storeName = 'swrv-store';
  protected tableName = 'swrv';
  protected store = null;

  // 默认存储桶: keyval-store, table:keyval
  constructor (ttl = 0, tableName = 'swrv', storeName = 'swrv-store') {
    super(ttl)
    this.db = null
    this.tableName = tableName
    this.storeName = storeName
    this.store = createStore(tableName, storeName)
  }

  private encode (storage) {
    return JSON.stringify(storage)
  }

  private decode (storage) {
    return JSON.parse(storage)
  }

  get (k: string) {
    const _key = this.serializeKey(k)
    const result = get(_key, this.store).then((item) => {
      if (item) {
        const itemParsed: ICacheItem<any> = this.decode(item)
        if (itemParsed?.expiresAt === null) {
          itemParsed.expiresAt = Infinity // localStorage sets Infinity to 'null'
        }

        return itemParsed
      }
      return undefined
    }).catch((error) => {
      console.error(error)
    }) as unknown as ICacheItem<any>
    return result
  }

  set (k: string, v: any, ttl: number) {
    let payload = {}
    const _key = this.serializeKey(k)
    const timeToLive = ttl || this.ttl
    const now = Date.now()
    const item = {
      data: v,
      createdAt: now,
      expiresAt: timeToLive ? now + timeToLive : Infinity
    }
    payload = item
    this.dispatchExpire(timeToLive, item, _key)
    set(_key, this.encode(payload), this.store)
  }

  dispatchExpire (ttl, item, serializedKey) {
    ttl && setTimeout(() => {
      const current = Date.now()
      const hasExpired = current >= item.expiresAt
      if (hasExpired) this.delete(serializedKey)
    }, ttl)
  }

  delete (serializedKey: string) {
    del(serializedKey, this.store).then(async () => {})
  }
}
