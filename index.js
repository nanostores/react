import { listenKeys } from 'nanostores'
import { useCallback } from 'react'
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js'

export function useStore(store, opts = {}) {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof store === 'function') {
      throw new Error(
        'Use useStore(Template(id)) or useSync() ' +
        'from @logux/client/react for templates'
      )
    }
  }

  let sub = useCallback(
    (onChange) => opts.keys
      ? listenKeys(
        store,
        opts.keys,
        onChange
      )
      : store.listen(onChange),
    [opts.keys, store]
  )

  let get = store.get.bind(store);

  return useSyncExternalStore(
    sub,
    get,
    get
  )
}
