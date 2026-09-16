import type { Ref } from 'vue'
import type SWRVCache from './cache/index.js'
import type { LocalStorageCache } from './cache/index.js'

export type { IKey, keyType } from './lib/key.js'

export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>

export interface IConfig<
  Data = any,
  Fn extends fetcherFn<Data> = fetcherFn<Data>
> {
  refreshInterval?: number
  cache?: LocalStorageCache | SWRVCache<any>
  dedupingInterval?: number
  ttl?: number
  serverTTL?: number
  revalidateOnFocus?: boolean
  revalidateDebounce?: number
  shouldRetryOnError?: boolean | ((err: Error) => boolean)
  errorRetryInterval?: number
  errorRetryCount?: number
  fetcher?: Fn,
  isOnline?: () => boolean
  isDocumentVisible?: () => boolean
}

export interface revalidateOptions {
  shouldRetryOnError?: boolean | ((err: Error) => boolean),
  errorRetryCount?: number,
  forceRevalidate?: boolean,
}

export interface IResponse<Data = any, Error = any> {
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  isValidating: Ref<boolean>
  isLoading: Ref<boolean>
  mutate: (data?: fetcherFn<Data>, opts?: revalidateOptions) => Promise<void>
}

/**
 * The three caches useSWRV relies on. They share one key space, so they isolate as a unit:
 * isolating only `data` still lets an in-flight request or a ref fan-out cross between apps.
 */
export interface SwrvCacheBundle {
  data: SWRVCache<any>
  promises: SWRVCache<any>
  refs: SWRVCache<any>
}
