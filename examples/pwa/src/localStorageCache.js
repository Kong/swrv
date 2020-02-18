export default class LocalStorageCache {
  constructor () {
    this.STORAGE_KEY = 'swrv'
  }
  encode (storage) { return btoa(JSON.stringify(storage)) }
  decode (storage) { return JSON.parse(atob(storage)) }

  get (k) {
    const item = localStorage.getItem(this.STORAGE_KEY)
    if (item) {
      return JSON.parse(atob(item))[k]
    }
  }

  set (k, v) {
    let payload = {}
    const storage = localStorage.getItem(this.STORAGE_KEY)
    if (storage) {
      payload = this.decode(storage)
      payload[k] = { data: v, ttl: Date.now() }
    } else {
      payload = { [k]: { data: v, ttl: Date.now() } }
    }

    localStorage.setItem(this.STORAGE_KEY, this.encode(payload))
  }
}
