import SWRVCache from './cache'
import LocalStorageCache from './cache/adapters/localStorage'
import useSWRV, { getSwrvCache, mutate, provideSwrvCache, swrvCacheInjectionKey } from './use-swrv'
import { swrvCachePlugin } from './plugin'

export {
  IConfig,
  SwrvCacheBundle
} from './types'
export { mutate, SWRVCache, LocalStorageCache, getSwrvCache, provideSwrvCache, swrvCacheInjectionKey, swrvCachePlugin }
export default useSWRV
