import SWRVCache from './cache'
import useSWRV, { mutate, provideSwrvCache, swrvCacheInjectionKey } from './use-swrv'
import { swrvCachePlugin } from './plugin'

export {
  IConfig,
  SwrvCacheBundle
} from './types'
export { mutate, SWRVCache, provideSwrvCache, swrvCacheInjectionKey, swrvCachePlugin }
export default useSWRV
