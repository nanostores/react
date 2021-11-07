import { listenKeys } from 'nanostores'
import React from 'react'

import { batch } from './batch/index.js'

export { batch }

export function useStore(store, opts = {}) {
  let [, forceRender] = React.useState({})

  if (process.env.NODE_ENV !== 'production') {
    if (typeof store === 'function') {
      throw new Error(
        'Use useStore(Template(id)) or useSync() ' +
          'from @logux/client/react for templates'
      )
    }
  }

  React.useEffect(() => {
    let rerender = () => {
      batch(() => {
        forceRender({})
      })
    }
    if (opts.keys) {
      return listenKeys(store, opts.keys, rerender)
    } else {
      return store.listen(rerender)
    }
  }, [store, '' + opts.keys])

  return store.get()
}

export function useStoreListener(store, opts = {}) {
  if (process.env.NODE_ENV !== 'production') {
    if (typeof store === 'function') {
      throw new Error(
        'Use useStore(Template(id)) or useSync() ' +
          'from @logux/client/react for templates'
      )
    }
  }

  let listenerRef = React.useRef(opts.listener)
  listenerRef.current = opts.listener

  React.useEffect(() => {
    let listener = (value, changed) => listenerRef.current(value, changed)
    if (opts.leading) {
      listener(store.get())
    }
    if (opts.keys) {
      return listenKeys(store, opts.keys, listener)
    } else {
      return store.listen(listener)
    }
  }, [store, '' + opts.keys, opts.leading])

  return null
}
