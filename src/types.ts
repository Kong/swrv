import { Ref } from 'vue'
import SWRVCache from './lib/cache'

export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>

export interface IConfig {
  refreshInterval?: number
  cache?: SWRVCache
  dedupingInterval?: number
  ttl?: number
  serverTTL?: number
  revalidateOnFocus?: boolean
  revalidateDebounce?: number
  shouldRetryOnError?: boolean
  errorRetryInterval?: number
  errorRetryCount?: number
}

export interface IResponse<Data = any, Error = any> {
  data?: Ref<Data | undefined>
  error?: Ref<Error | undefined>
  isValidating: Ref<boolean>
  mutate: () => Promise<void>
}

export type keyType = string | any[] | null
type keyFunction = () => keyType

export type IKey = keyFunction | keyType

export interface revalidateOptions {
  shouldRetryOnError?: boolean,
  errorRetryCount?: number
}
