import type { WatchSource } from 'vue'

export type keyType = string | any[] | null | undefined

export type IKey = keyType | WatchSource<keyType>
