import { listenKeys } from 'nanostores'
import { useCallback, useSyncExternalStore } from 'react'

export function useStore(store, opts = {}) {
  let subscribe = useCallback(
    onChange =>
      opts.keys
        ? listenKeys(store, Array.isArray(opts.keys) ? opts.keys : [opts.keys], onChange)
        : store.listen(onChange),
    [opts.keys, store]
  )

  let get = store.get.bind(store)

  return useSyncExternalStore(subscribe, get, get)
}
