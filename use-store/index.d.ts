import type { Store, StoreValue } from 'nanostores'
import type { DependencyList } from 'react'

type StoreKeys<T> = T extends { setKey: (k: infer K, v: any) => unknown }
  ? K
  : never

export interface UseStoreOptions<SomeStore> {
  /**
   * @default
   * ```ts
   * [store, options.keys]
   * ```
   */
  deps?: DependencyList

  /**
   * Will re-render components only on specific key changes.
   */
  keys?: StoreKeys<SomeStore>[]

  /**
   * Enable SSR support. Set `initial` when store's initial value is the same on
   * server and client, or provide a function to return the server store state
   * for advanced cases (per useSyncExternalStore's getServerSnapshot).
   */
  ssr?: (() => StoreValue<SomeStore>) | 'initial' | false
}

/**
 * Subscribe to store changes and get store’s value.
 *
 * Can be user with store builder too.
 *
 * ```js
 * import { useStore } from 'nanostores/react'
 *
 * import { router } from '../store/router'
 *
 * export const Layout = () => {
 *   let page = useStore(router)
 *   if (page.route === 'home') {
 *     return <HomePage />
 *   } else {
 *     return <Error404 />
 *   }
 * }
 * ```
 *
 * @param store Store instance.
 * @returns Store value.
 */
export function useStore<SomeStore extends Store>(
  store: SomeStore,
  options?: UseStoreOptions<SomeStore>
): StoreValue<SomeStore>
