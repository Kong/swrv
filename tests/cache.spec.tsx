import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import timeout from './utils/jest-timeout'
import useSWRV from '../src/use-swrv'
import LocalStorageAdapter from '../src/cache/adapters/localStorage'
import { ICacheItem } from '../src/cache'
import tick from './utils/tick'
import { advanceBy, advanceTo } from 'jest-date-mock'

jest.useFakeTimers()

describe('cache - adapters', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('localStorage', () => {
    const fetch = url => new Promise((resolve) => {
      setTimeout(() => { resolve(`I am a response from ${url}`) }, 100)
    })

    it('saves data cache', async () => {
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/users', fetch, {
            cache: new LocalStorageAdapter()
          })
        }
      }))

      expect(localStorage.getItem('swrv')).toBeNull()

      await timeout(100)

      const localStorageData: Record<string, ICacheItem<any>> = JSON.parse(localStorage.getItem('swrv'))

      expect(localStorage.getItem('swrv')).toBeDefined()
      expect(localStorageData).toHaveProperty('/api/users')
      expect(localStorageData['/api/users'].expiresAt).toBeNull() // Infinity shows up as 'null'
      expect(localStorageData['/api/users'].createdAt).toBeLessThanOrEqual(Date.now())
      expect(localStorageData['/api/users'].data.data).toBe('I am a response from /api/users')
    })

    it('updates data cache', async () => {
      let count = 0
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/consumers', () => ++count, {
            cache: new LocalStorageAdapter(),
            refreshInterval: 100,
            dedupingInterval: 0
          })
        }
      }))

      expect(localStorage.getItem('swrv')).toBeDefined()
      const checkStorage = (key): Record<string, ICacheItem<any>> => {
        return JSON.parse(localStorage.getItem('swrv'))[key]
      }

      await timeout(100)
      await tick()
      expect(checkStorage('/api/consumers').data.data).toBe(1)

      await timeout(100)
      await tick()
      expect(checkStorage('/api/consumers').data.data).toBe(2)

      await timeout(100)
      await tick()
      expect(checkStorage('/api/consumers').data.data).toBe(3)
    })

    it('deletes cache item after expiry', async () => {
      advanceTo(new Date())
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/services', fetch, {
            cache: new LocalStorageAdapter('swrv', 200)
          })
        }
      }))

      expect(localStorage.getItem('swrv')).toBeDefined()
      const checkStorage = (key): Record<string, ICacheItem<any>> => {
        const db = localStorage.getItem('swrv')
        if (!db) {
          return undefined
        }
        return JSON.parse(db)[key]
      }

      await timeout(100)
      await tick(4)
      expect(checkStorage('/api/services').data.data).toBe('I am a response from /api/services')

      // TODO: not sure why only running both these methods works
      await advanceBy(200)
      await timeout(200)

      await tick()
      expect(checkStorage('/api/services')).toBeUndefined()
    })

    it('accepts custom localStorage key', async () => {
      mount(defineComponent({
        template: '<div>hello, {{ data }}</div>',
        setup () {
          return useSWRV('/api/some-data', fetch, {
            cache: new LocalStorageAdapter('myAppData')
          })
        }
      }))

      expect(localStorage.getItem('myAppData')).toBeNull()
      expect(localStorage.getItem('swrv')).toBeNull()

      await timeout(100)
      expect(localStorage.getItem('myAppData')).toBeDefined()
    })
  })
})
