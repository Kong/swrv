import SWRVCache from './cache'
import useSWRV, { getSwrvCache, mutate, provideSwrvCache, swrvCacheInjectionKey } from './use-swrv'
import { swrvCachePlugin } from './plugin'

export {
  IConfig,
  SwrvCacheBundle
} from './types'
export { mutate, SWRVCache, getSwrvCache, provideSwrvCache, swrvCacheInjectionKey, swrvCachePlugin }
export default useSWRV
