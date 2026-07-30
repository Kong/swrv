import { Ref, WatchSource } from 'vue'
import SWRVCache from './cache'
import LocalStorageCache from './cache/adapters/localStorage'

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

export type keyType = string | any[] | null | undefined

export type IKey = keyType | WatchSource<keyType>

/**
 * Bundles the three module-singleton caches useSWRV relies on: the data cache (config.cache),
 * the in-flight-request dedup cache, and the reactive-ref fan-out cache that pushes revalidated
 * data to every hook sharing a key. All three share the same key space, so they're isolated as
 * one unit — an in-flight request or a ref fan-out event in one app instance never crosses into
 * another's.
 */
export interface SwrvCacheBundle {
  data: SWRVCache<any>
  promises: SWRVCache<any>
  refs: SWRVCache<any>
}
