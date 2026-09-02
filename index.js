import { listenKeys } from 'nanostores'
import { useCallback, useRef, useSyncExternalStore } from 'react'

let emit = (snapshotRef, onChange) => value => {
  if (snapshotRef.current === value) return
  snapshotRef.current = value
  onChange()
}

export function useStore(store, { keys, deps = [store, keys], ssr } = {}) {
  let snapshotRef = useRef()
  snapshotRef.current = store.get()

  let subscribe = useCallback(onChange => {
    emit(snapshotRef, onChange)(store.value)

    return keys?.length > 0
      ? listenKeys(store, keys, emit(snapshotRef, onChange))
      : store.listen(emit(snapshotRef, onChange))
  }, deps)

  let get = () => snapshotRef.current

  let server = get
  if (ssr && 'init' in store) {
    server = ssr === 'initial' ? () => store.init : ssr
  }

  return useSyncExternalStore(subscribe, get, server)
}

let loadings = new WeakMap()

let isLoading = value => value.isLoading || value.state === 'loading'

function suspend(store) {
  let promise = loadings.get(store)
  if (!promise) {
    promise = new Promise(resolve => {
      let unbind = store.listen(value => {
        if (!isLoading(value)) {
          loadings.delete(store)
          unbind()
          resolve()
        }
      })
    })
    loadings.set(store, promise)
  }
  return promise
}

export function useLoadingStore(store) {
  let value = useStore(store)
  if (isLoading(value)) throw suspend(store)
  if (value.state === 'failed' || value.error) throw value.error
  return value.state === 'ready' ? value.value : value
}
