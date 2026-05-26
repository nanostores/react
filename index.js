import { useCallback, useRef, useSyncExternalStore } from 'react'

let emit = (snapshotRef, onChange) => value => {
  if (snapshotRef.current === value) return
  snapshotRef.current = value
  onChange()
}

export function test() {
  return 1
}

export function useStore(store, { keys, deps = [store, keys], ssr } = {}) {
  let snapshotRef = useRef()
  snapshotRef.current = store.get()

  let subscribe = useCallback(onChange => {
    emit(snapshotRef, onChange)(store.value)

    if (keys && keys.length > 0) {
      let keysSet = new Set(keys).add(undefined)
      return store.listen((value, _, changed) => {
        let baseKey = changed ? changed.split(/\.|\[/)[0] : undefined
        if (keysSet.has(changed) || keysSet.has(baseKey)) {
          emit(snapshotRef, onChange)(value)
        }
      })
    }
    return store.listen(emit(snapshotRef, onChange))
  }, deps)

  let get = () => snapshotRef.current

  let server = get
  if (ssr && 'init' in store) {
    server = ssr === 'initial' ? () => store.init : ssr
  }

  return useSyncExternalStore(subscribe, get, server)
}
