import { useCallback } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector'

function defaultCompare(a, b) {
  return a === b
}

export function useSelector(
  store,
  selector,
  { compare = defaultCompare, ssr } = {}
) {
  let subscribe = useCallback(
    handleStoreChange => {
      if (!store) return () => {}

      let unsubscribe = store.listen(handleStoreChange)
      return unsubscribe
    },
    [store]
  )

  let get = useCallback(() => store?.get(), [store])

  let server = get
  if (ssr && store && 'init' in store) {
    server = ssr === 'initial' ? () => store.init : ssr
  }

  return useSyncExternalStoreWithSelector(
    subscribe,
    get,
    server,
    selector,
    compare
  )
}
