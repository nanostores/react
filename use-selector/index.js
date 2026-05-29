import { computed } from 'nanostores'
import { useCallback, useMemo, useSyncExternalStore, useRef } from 'react'

function defaultCompare(a, b) {
  return a === b
}

function emit(snapshotRef, onChange, compare) {
  return value => {
    if (compare(snapshotRef.current, value)) return
    snapshotRef.current = value
    onChange()
  }
}

export function useSelector(
  store,
  selector,
  { compare = defaultCompare, ssr } = {}
) {
  let $computed = useMemo(() => computed(store, selector), [store, selector])

  let snapshotRef = useRef()
  snapshotRef.current = $computed.get()

  let subscribe = useCallback(
    onChange => {
      emit(snapshotRef, onChange, compare)($computed.value)

      return $computed.listen(emit(snapshotRef, onChange, compare))
    },
    [$computed, compare]
  )

  let get = () => snapshotRef.current

  let server = get
  if (ssr && 'init' in store) {
    server =
      ssr === 'initial' ? () => selector(store.init) : () => selector(ssr())
  }

  return useSyncExternalStore(subscribe, get, server)
}
