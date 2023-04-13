import { Store, StoreValue } from 'nanostores'

type AllKeys<T> = T extends any ? keyof T : never

type StoreKeys<T> = T extends { setKey: (k: infer K, v: any) => unknown }
  ? K
  : never

export interface UseStoreOptions<SomeStore> {
  /**
   * Will re-render components only on specific key changes.
   */
  keys?: StoreKeys<SomeStore>[]
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

/**
 * Batch React updates. It is just wrap for React’s `unstable_batchedUpdates`
 * with fix for React Native.
 *
 * ```js
 * import { batch } from 'nanostores/react'
 *
 * React.useEffect(() => {
 *   let unbind = store.listen(() => {
 *     batch(() => {
 *       forceRender({})
 *     })
 *   })
 * })
 * ```
 *
 * @param cb Callback to run in batching.
 */
export function batch(cb: () => void): void
