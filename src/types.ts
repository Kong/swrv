import { Ref } from '@vue/composition-api'
import SWRVCache from './lib/cache'
export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>
export interface IConfig {
  refreshInterval?: number
  cache?: SWRVCache
  dedupingInterval?: number
  ttl?: number
  revalidateOnFocus?: boolean
  revalidateDebounce?: number
  fetchOnServer?: boolean | (() => boolean)
  onError?: (
    err: Error,
    key: string
  ) => void
}

export interface IResponse {
  data?: Ref<any>
  error?: Ref<any>
  isValidating: Ref<boolean>
  revalidate: Function
}

type keyFunction = () => string | null
export type IKey = keyFunction | string | null
