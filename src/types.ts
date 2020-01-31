import { Ref } from '@vue/composition-api'
import SWRCache from './lib/cache'

export interface IConfig {
  refreshInterval?: number
  cache?: SWRCache
  dedupingInterval?: number
  ttl?: number
}

export interface IResponse {
  data?: Ref<any>
  error?: Ref<any>
  isValidating: Ref<boolean>
  revalidate: Function
}

export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>
type keyFunction = () => string | null
export type IKey = keyFunction | string | null
