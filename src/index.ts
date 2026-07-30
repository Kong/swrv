import SWRVCache from './cache'
import useSWRV, { mutate, provideSwrvCache, swrvCacheInjectionKey } from './use-swrv'

export {
  IConfig,
  SwrvCacheBundle
} from './types'
export { mutate, SWRVCache, provideSwrvCache, swrvCacheInjectionKey }
export default useSWRV
