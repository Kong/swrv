import SWRCache from './lib/cache'

export interface IConfig {
  refreshInterval?: number,
  cache?: SWRCache,
  dedupingInterval?: number,
  ttl?: number
}

export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>
type keyFunction = () => string | null
export type IKey = keyFunction | string | null
