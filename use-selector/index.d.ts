import type { ReadableAtom } from 'nanostores'
import type { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'

type SyncExternalStoreSubscribe = Parameters<
  typeof useSyncExternalStoreWithSelector
>[0]

export interface UseSelectorOptions<T, Snapshot> {
  /**
   * Custom equality function (defaults to strict equality check).
   */
  compare?: (a: T, b: T) => boolean
  /**
   * Enable SSR support. Set `initial` when selector's initial value is the same on
   * server and client, or provide a function to return the server selector state
   * for advanced cases (per useSyncExternalStoreWithSelector's getServerSnapshot).
   */
  ssr?: 'initial' | (() => Snapshot) | false
}

/**
 * React hook to subscribe to a nanostores atom with high-performance selection.
 * Only re-renders if the selector result changes (uses strict equality by default).
 * @param store Store to subscribe to.
 * @param selector Function to derive data from the store state.
 * @param options Configuration options for evaluation and server-side rendering.
 */
export function useSelector<Store extends ReadableAtom | undefined, T>(
  store: Store,
  selector: (
    snapshot: Store extends { get: () => infer Snapshot } ? Snapshot : undefined
  ) => T,
  options?: UseSelectorOptions<
    T,
    Store extends { get: () => infer Snapshot } ? Snapshot : undefined
  >
): T
