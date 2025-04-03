import 'fake-indexeddb/auto'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import timeout from './utils/jest-timeout'
import useSWRV from '../src/use-swrv'
import IndexedDBStoargeCache from '../src/cache/adapters/indexedDBStoarge'
import { createStore, get, keys, clear } from 'idb-keyval'
import { ICacheItem } from 'src/cache'
import { advanceBy, advanceTo } from 'jest-date-mock'
import tick from './utils/tick'

const store = createStore('swrv', 'swrv-store')
const newStore = createStore('myAppData', 'swrv-store')

jest.useFakeTimers()

describe('indexedDB-cache - adapters', () => {
  beforeEach(async () => {
    // store?.clear()
    // newStore?.clear();
    await clear(store)
    await clear(newStore)
  })

  describe('indexedDBStorage', () => {
    const fetch = url => new Promise((resolve) => {
      setTimeout(() => { resolve(`I am a response from ${url}`) }, 100)
    })

    it('saves data cache', async () => {
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/users', fetch, {
            cache: new IndexedDBStoargeCache()
          })
        }
      }))
      const temp = await get('/api/users', store)
      expect(temp).toBeUndefined()

      await timeout(100)

      const indexedDBStoargeSourceData = await get('/api/users', store)
      expect(indexedDBStoargeSourceData).toBeDefined()

      const indexedDBStoargeSourceDataKeys = await keys(store)
      const indexedDBStoargeData: Record<string, ICacheItem<any>> = JSON.parse(indexedDBStoargeSourceData)
      expect(indexedDBStoargeSourceDataKeys).toContain('/api/users')
      expect(indexedDBStoargeData.expiresAt).toBeNull() // Infinity shows up as 'null'
      expect(indexedDBStoargeData.createdAt).toBeLessThanOrEqual(Date.now())
      expect(indexedDBStoargeData.data.data).toBe('I am a response from /api/users')
    })

    it('updates data cache', async () => {
      let count = 0
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/consumers', () => ++count, {
            cache: new IndexedDBStoargeCache(),
            refreshInterval: 100,
            dedupingInterval: 0
          })
        }
      }))

      await timeout(200)
      await tick()

      await get('/api/consumers', store)

      const indexedDBStoargeSourceData = await get('/api/consumers', store)
      expect(indexedDBStoargeSourceData).toBeDefined()

      const checkStorage = async (key): Promise<Record<string, ICacheItem<any>>> => {
        return JSON.parse(await get(key, store))
      }

      expect((await checkStorage('/api/consumers')).data.data).toBe(1)

      await timeout(100)
      await tick()
      expect((await checkStorage('/api/consumers')).data.data).toBe(2)

      await timeout(100)
      await tick()
      expect((await checkStorage('/api/consumers')).data.data).toBe(3)
    })

    it('deletes cache item after expiry', async () => {
      advanceTo(new Date())
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/services', fetch, {
            cache: new IndexedDBStoargeCache(200)
          })
        }
      }))

      const checkStorage = async (key): Promise<Record<string, ICacheItem<any>>> => {
        await get(key, store)
        const db = await get(key, store)
        if (!db) {
          return undefined
        }
        return JSON.parse(db)
      }

      await timeout(100)
      await tick(4)

      expect((await checkStorage('/api/services')).data.data).toBe('I am a response from /api/services')

      // TODO: not sure why only running both these methods works
      await advanceBy(200)
      await timeout(200)

      await tick()
      expect(await checkStorage('/api/services')).toBeUndefined()
    })

    it('accepts custom indexedDBStorage key', async () => {
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/some-data', fetch, {
            cache: new IndexedDBStoargeCache(0, 'myAppData', 'swrv-store')
          })
        }
      }))

      const myAppDataValue = await get('/api/some-data', newStore)
      expect(myAppDataValue).toBeUndefined()

      const swrvValue = await get('/api/some-data', store)
      expect(swrvValue).toBeUndefined()

      await timeout(100)
      await tick()

      const myAppDataValue2 = await get('/api/some-data', newStore)
      expect(myAppDataValue2).toBeDefined()
    })
  })
})
