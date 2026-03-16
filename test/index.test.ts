import './setup.js'

import { act, render, screen } from '@testing-library/react'
import { delay } from 'nanodelay'
import { atom, computed, map, onMount, STORE_UNMOUNT_DELAY } from 'nanostores'
import { deepStrictEqual, equal, notEqual } from 'node:assert'
import { afterEach, test } from 'node:test'
import type { FC, ReactNode } from 'react'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { useStore } from '../index.js'

let { createElement: h, useState } = React

afterEach(() => {
  window.document.head.innerHTML = ''
  window.document.body.innerHTML = '<main></main>'
})

test('renders simple store', async () => {
  let renders = 0

  let letter = atom('a')

  let second = atom(0)

  let Test1: FC = () => {
    renders += 1
    let value = useStore(letter)
    let number = useStore(second)
    return h('div', { 'data-testid': 'test1' }, `${value}${number}`)
  }

  let Test2: FC = () => {
    let value = useStore(letter)
    return h('div', { 'data-testid': 'test2' }, value)
  }

  let Wrapper: FC = () => {
    let [show, setShow] = useState<boolean>(true)
    return h(
      'div',
      {},
      h('button', {
        onClick: () => {
          setShow(false)
        }
      }),
      show && h(Test1),
      show && h(Test2)
    )
  }

  render(h(Wrapper))
  equal(screen.getByTestId('test1').textContent, 'a0')
  equal(screen.getByTestId('test2').textContent, 'a')
  equal(renders, 1)

  await act(async () => {
    letter.set('b')
    letter.set('c')
    second.set(1)
    await delay(1)
  })

  equal(screen.getByTestId('test1').textContent, 'c1')
  equal(screen.getByTestId('test2').textContent, 'c')
  equal(renders, 2)

  notEqual(screen.queryByTestId('test1'), null)
  act(() => {
    screen.getByRole('button').click()
  })
  equal(screen.queryByTestId('test1'), null)
  equal(renders, 2)
})

test('does not reload store on component changes', async () => {
  let destroyed = ''
  let simple = atom<string>('')

  onMount(simple, () => {
    simple.set('S')
    return () => {
      destroyed += 'S'
    }
  })

  let TestA: FC = () => {
    let simpleValue = useStore(simple)
    return h('div', { 'data-testid': 'test' }, `1 ${simpleValue}`)
  }

  let TestB: FC = () => {
    let simpleValue = useStore(simple)
    return h('div', { 'data-testid': 'test' }, `2 ${simpleValue}`)
  }

  let Switcher: FC = () => {
    let [state, setState] = useState<'a' | 'b' | 'none'>('a')
    if (state === 'a') {
      return h(
        'div',
        {},
        h('button', {
          onClick: () => {
            setState('b')
          }
        }),
        h(TestA)
      )
    } else if (state === 'b') {
      return h(
        'div',
        {},
        h('button', {
          onClick: () => {
            setState('none')
          }
        }),
        h(TestB)
      )
    } else {
      return null
    }
  }

  render(h(Switcher))
  equal(screen.getByTestId('test').textContent, '1 S')

  act(() => {
    screen.getByRole('button').click()
  })
  equal(screen.getByTestId('test').textContent, '2 S')
  equal(destroyed, '')

  act(() => {
    screen.getByRole('button').click()
  })
  equal(screen.queryByTestId('test'), null)
  equal(destroyed, '')

  await delay(STORE_UNMOUNT_DELAY)
  equal(destroyed, 'S')
})

test('handles keys option', async () => {
  type MapStore = {
    a?: string
    b?: string
  }
  let Wrapper: FC<{ children?: ReactNode }> = ({ children }) => {
    return h('div', {}, children)
  }
  let mapStore = map<MapStore>()
  let renderCount = 0
  let MapTest = (): React.ReactElement => {
    renderCount++
    let [keys, setKeys] = useState<(keyof MapStore)[]>(['a'])
    let { a, b } = useStore(mapStore, { keys })
    return h(
      'div',
      { 'data-testid': 'map-test' },
      h('button', {
        onClick: () => {
          setKeys(['a', 'b'])
        }
      }),
      `map:${a}-${b}`
    )
  }

  render(h(Wrapper, {}, h(MapTest)))

  equal(screen.getByTestId('map-test').textContent, 'map:undefined-undefined')
  equal(renderCount, 1)

  // updates on init
  await act(async () => {
    mapStore.set({ a: undefined, b: undefined })
    await delay(1)
  })

  equal(screen.getByTestId('map-test').textContent, 'map:undefined-undefined')
  equal(renderCount, 2)

  // updates when has key
  await act(async () => {
    mapStore.setKey('a', 'a')
    await delay(1)
  })

  equal(screen.getByTestId('map-test').textContent, 'map:a-undefined')
  equal(renderCount, 3)

  // does not update when has no key
  await act(async () => {
    mapStore.setKey('b', 'b')
    await delay(1)
  })

  equal(screen.getByTestId('map-test').textContent, 'map:a-undefined')
  equal(renderCount, 3)

  // reacts on parameter changes
  await act(async () => {
    screen.getByRole('button').click()
    await delay(1)
  })

  equal(screen.getByTestId('map-test').textContent, 'map:a-b')
  equal(renderCount, 4)
})

test('works with stores that set their values in lifecycle hooks', () => {
  let $1 = atom(1)
  let $2 = atom(1)

  let $c = computed([$1, $2], (a, b) => a + b)

  let Test: FC = () => {
    let value = useStore($c)
    if (value !== 2) throw new Error()
    return h('div', null, value)
  }

  render(h(Test))
})

test('useSyncExternalStore late subscription handling', () => {
  let $1 = atom('original content')

  let Test: FC = () => {
    let value = useStore($1)
    // state update before the useSyncExternalStore subscription happen
    $1.set('updated content')

    return h('div', { 'data-testid': 'subscription-test' }, value)
  }

  render(h(Test))

  equal(screen.getByTestId('subscription-test').textContent, 'updated content')
})

test('support for SSR does not break server behaviour in non-SSR projects', () => {
  type Value = 'new' | 'old'
  let atomStore = atom<Value>('old')
  let mapStore = map<{ value: Value }>({ value: 'old' })

  let atomValues: Value[] = [] // Track values used across renders

  let AtomTest: FC = () => {
    let value = useStore(atomStore)
    atomValues.push(value)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Value[] = [] // Track values used across renders

  let MapTest: FC = () => {
    let value = useStore(
      mapStore,
      // Setting `ssr:false` should be equivalent to not setting `ssr` at all
      { ssr: false }
    ).value
    mapValues.push(value)
    return h('div', { 'data-testid': 'map-test' }, value)
  }

  let Wrapper: FC = () => {
    return h('div', { 'data-testid': 'test' }, h(AtomTest), h(MapTest))
  }

  // Simulate store state change on server side
  atomStore.set('new')
  mapStore.set({ value: 'new' })

  // Create a "server" rendered element to re-hydrate. Thanks to childrentime
  // https://github.com/testing-library/react-testing-library/issues/1120#issuecomment-2065733238
  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  // Confirm server rendered HTML includes the latest store data
  equal(screen.getByTestId('atom-test').textContent, 'new')
  equal(screen.getByTestId('map-test').textContent, 'new')
})

test('support SSR to fix client hydration errors, use initial data', t => {
  type Value = 'new' | 'old'
  let atomStore = atom<Value>('old')
  let mapStore = map<{ value: Value }>({ value: 'old' })

  let atomValues: Value[] = [] // Track values used across renders

  let AtomTest: FC = () => {
    let value = useStore(atomStore, { ssr: true })
    atomValues.push(value)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Value[] = [] // Track values used across renders

  let MapTest: FC = () => {
    let value = useStore(mapStore, { ssr: true }).value
    mapValues.push(value)
    return h('div', { 'data-testid': 'map-test' }, value)
  }

  let Wrapper: FC = () => {
    return h('div', { 'data-testid': 'test' }, h(AtomTest), h(MapTest))
  }

  // Create a "server" rendered element to re-hydrate. Thanks to childrentime
  // https://github.com/testing-library/react-testing-library/issues/1120#issuecomment-2065733238
  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  equal(screen.getByTestId('atom-test').textContent, 'old')
  equal(screen.getByTestId('map-test').textContent, 'old')

  // Simulate store change on client, now different from value at "server" SSR
  atomStore.set('new')
  mapStore.set({ value: 'new' })

  // Hydrate into SSR element. Logs errors to console on hydration failure
  let consoleErrorMock = t.mock.method(console, 'error', () => {})
  act(() => {
    hydrateRoot(ssrElement, h(Wrapper))
  })

  // Check nothing was logged to `console.error()`
  let consoleErrorCall = consoleErrorMock.mock.calls[0] as
    | { arguments: any }
    | undefined
  let consoleErrorMessage = String(consoleErrorCall?.arguments?.[0] ?? '')
  equal(consoleErrorMessage, '')

  // Confirm "server" render (renderToString) got old values, initial client
  // render got old values at hydration, then post-hydration render got new
  // values
  deepStrictEqual(atomValues, ['old', 'old', 'new'])
  deepStrictEqual(mapValues, ['old', 'old', 'new'])

  equal(screen.getByTestId('atom-test').textContent, 'new')
  equal(screen.getByTestId('map-test').textContent, 'new')
})

test('support SSR to fix client hydration errors, server passes data to client', t => {
  type Value = 'initial' | 'update on client' | 'update on server'
  let atomStore = atom<Value>('initial')
  let mapStore = map<{ value: Value }>({ value: 'initial' })

  let ssrDataFnForAtom: typeof atomStore.get | undefined
  let ssrDataFnForMap: typeof mapStore.get | undefined

  let atomValues: Value[] = [] // Track values used across renders

  let AtomTest: FC = () => {
    let value = useStore(atomStore, { ssr: ssrDataFnForAtom })
    atomValues.push(value)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Value[] = [] // Track values used across renders

  let MapTest: FC = () => {
    let value = useStore(mapStore, { ssr: ssrDataFnForMap }).value
    mapValues.push(value)
    return h('div', { 'data-testid': 'map-test' }, value)
  }

  let Wrapper: FC = () => {
    return h(
      'div',
      { 'data-testid': 'test' },
      h(AtomTest, null),
      h(MapTest, null)
    )
  }

  // Simulate store state change on server side
  atomStore.set('update on server')
  mapStore.set({ value: 'update on server' })

  // Create a "server" rendered element to re-hydrate. Thanks to childrentime
  // https://github.com/testing-library/react-testing-library/issues/1120#issuecomment-2065733238
  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  // Confirm server render includes latest updates to server store
  equal(screen.getByTestId('atom-test').textContent, 'update on server')
  equal(screen.getByTestId('map-test').textContent, 'update on server')

  // Simulate store change on client, now different from value at "server" SSR
  atomStore.set('update on client')
  mapStore.set({ value: 'update on client' })

  // Simulate passing of store state data from server to client, provided to
  // hook via `ssr` option
  ssrDataFnForAtom = (): Value => 'update on server'
  let serverDataForMap = { value: 'update on server' as Value }
  ssrDataFnForMap = (): { value: Value } => serverDataForMap

  // Hydrate into SSR element. Logs errors to console on hydration failure
  let consoleErrorMock = t.mock.method(console, 'error', () => {})
  act(() => {
    hydrateRoot(ssrElement, h(Wrapper))
  })

  // Check nothing was logged to `console.error()`
  let consoleErrorCall = consoleErrorMock.mock.calls[0] as
    | { arguments: any }
    | undefined
  let consoleErrorMessage = String(consoleErrorCall?.arguments?.[0] ?? '')
  equal(consoleErrorMessage, '')

  // Confirm "server" render (renderToString) got latest update on server,
  // initial client render got latest server update at hydration, then
  // post-hydration render got latest client update
  deepStrictEqual(atomValues, [
    'update on server',
    'update on server',
    'update on client'
  ])
  deepStrictEqual(mapValues, [
    'update on server',
    'update on server',
    'update on client'
  ])

  // Confirm final rendered version has latest updates to client store
  equal(screen.getByTestId('atom-test').textContent, 'update on client')
  equal(screen.getByTestId('map-test').textContent, 'update on client')
})
