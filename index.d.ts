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

export interface LoadingValue {
  /**
   * Loading error. Will be thrown to the nearest React error boundary.
   */
  error?: unknown

  /**
   * `true` while store loads its data.
   */
  isLoading: boolean
}

type Loaded<Value> = Exclude<
  Value,
  { error: NonNullable<unknown> } | { isLoading: true }
>

/**
 * Value of `@nanostores/async` stores.
 */
type AsyncValue<Value> =
  | { changing: boolean; error: unknown; state: 'failed' }
  | { changing: boolean; state: 'ready'; value: Value }
  | { state: 'loading' }

/**
 * Subscribe to loading store and suspend the component until it was loaded.
 *
 * It supports [`@nanostores/async`] stores and any store with `isLoading` key
 * in the value. While the store is loading, component will be suspended
 * and React will render the nearest `<Suspense>` fallback. If loading was
 * failed, the error will be thrown to the nearest error boundary. As a result,
 * the component gets only the loaded value.
 *
 * ```js
 * import { useLoadingStore } from '@nanostores/react'
 *
 * import { $user } from '../stores/user'
 *
 * export const UserName = () => {
 *   let user = useLoadingStore($user)
 *   return <h1>{user.name}</h1>
 * }
 * ```
 *
 * [`@nanostores/async`]: https://github.com/nanostores/async
 *
 * @param store Store instance.
 * @returns Loaded store value.
 */
export function useLoadingStore<Value extends AsyncValue<any> | LoadingValue>(
  store: Store<Value>
): [Value] extends [AsyncValue<infer Data>] ? Data : Loaded<Value>
