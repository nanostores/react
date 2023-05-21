import { listenKeys } from 'nanostores'
import { useCallback, useSyncExternalStore } from 'react'

export function useStore(store, opts = {}) {
  let sub = useCallback(
    onChange =>
      opts.keys
        ? listenKeys(store, opts.keys, onChange)
        : store.listen(onChange),
    [opts.keys, store]
  )

  let get = useCallback(() => store.value, [store]);

  return useSyncExternalStore(sub, get, get)
}
