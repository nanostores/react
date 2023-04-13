import { listenKeys } from 'nanostores'
import { useCallback } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js'

export function useStore(store, opts = {}) {
  let sub = useCallback(
    onChange =>
      opts.keys
        ? listenKeys(store, opts.keys, onChange)
        : store.listen(onChange),
    [opts.keys, store]
  )

  let get = store.get.bind(store)

  return useSyncExternalStore(sub, get, get)
}
