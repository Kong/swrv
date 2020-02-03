import { Ref } from '@vue/composition-api'
import SWRCache from './lib/cache'
export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>
export interface IConfig {
  refreshInterval?: number
  cache?: SWRCache
  dedupingInterval?: number
  ttl?: number,
  revalidateOnFocus?: boolean,
  onError?: (
    err: Error,
    key: string
  ) => void,
  onErrorRetry?: (
    err: Error,
    key: string,
    revalidate: void,
    revalidateOpts: any
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
