import { listenKeys } from 'nanostores'
import { useCallback, useRef, useSyncExternalStore } from 'react'

export function useStore(store, { keys, deps = [store, keys] } = {}) {
  let snapshotRef = useRef()
  snapshotRef.current = store.get()

  let subscribe = useCallback(
    onChange =>
      keys?.length > 0
        ? listenKeys(store, keys, emit(snapshotRef, onChange))
        : store.listen(emit(snapshotRef, onChange)),
    deps
  )
  let get = () => snapshotRef.current

  return useSyncExternalStore(subscribe, get, get)
}

let emit = (snapshotRef, onChange) => value => {
  snapshotRef.current = value
  onChange()
}
