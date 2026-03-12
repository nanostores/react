import { listenKeys } from 'nanostores'
import { useCallback, useRef, useSyncExternalStore } from 'react'

let emit = (snapshotRef, onChange) => value => {
  if (snapshotRef.current === value) return
  snapshotRef.current = value
  onChange()
}

export function useStore(store, { keys, deps = [store, keys] } = {}) {
  let snapshotRef = useRef()
  snapshotRef.current = store.get()

  let subscribe = useCallback(onChange => {
    emit(snapshotRef, onChange)(store.value)

    return keys?.length > 0
      ? listenKeys(store, keys, emit(snapshotRef, onChange))
      : store.listen(emit(snapshotRef, onChange))
  }, deps)
  let get = () => snapshotRef.current
  // `'init' in store` check for compatibility with nanostores <= 1.1.1
  let init = 'init' in store ? () => store.init : get

  return useSyncExternalStore(subscribe, get, init)
}
