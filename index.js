import { listenKeys } from 'nanostores'
import React from 'react'

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
    if (opts.keys) {
      return listenKeys(store, opts.keys, () => {
        forceRender({})
      })
    } else {
      return store.listen(() => {
        forceRender({})
      })
    }
  }, [store, '' + opts.keys])

  return store.get()
}
