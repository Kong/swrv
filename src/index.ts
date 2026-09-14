import SWRVCache, { LocalStorageCache } from './cache/index.js'
import useSWRV, { getSwrvCache, mutate, provideSwrvCache, swrvCacheInjectionKey } from './use-swrv.js'
import { swrvCachePlugin } from './plugin.js'

export type {
  IConfig,
  IKey,
  IResponse,
  SwrvCacheBundle,
  fetcherFn
} from './types.js'
export { mutate, SWRVCache, LocalStorageCache, getSwrvCache, provideSwrvCache, swrvCacheInjectionKey, swrvCachePlugin }
export default useSWRV
