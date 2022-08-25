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
  shouldRetryOnError?: boolean
  errorRetryInterval?: number
  errorRetryCount?: number
  fetcher?: Fn,
  isOnline?: () => boolean
  isDocumentVisible?: () => boolean
}

export interface revalidateOptions {
  shouldRetryOnError?: boolean,
  errorRetryCount?: number,
  forceRevalidate?: boolean,
}

export interface IResponse<Data = any, Error = any> {
  data: Ref<Data | undefined>
  error: Ref<Error | undefined>
  isValidating: Ref<boolean>
  mutate: (data?: fetcherFn<Data>, opts?: revalidateOptions) => Promise<void>
}

export type keyType = string | any[] | null | undefined

export type IKey = keyType | WatchSource<keyType>
