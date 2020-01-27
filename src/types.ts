export interface IConfig {
  refreshInterval: 0
}

export type fetcherFn<Data> = (...args: any) => Data | Promise<Data>
