import './setup.js'

import { act, render, screen } from '@testing-library/react'
import { delay } from 'nanodelay'
import { atom, computed, map } from 'nanostores'
import { equal, deepStrictEqual } from 'node:assert'
import { afterEach, test } from 'node:test'
import type { FC } from 'react'
import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { useSelector } from '../index.js'

let { createElement: h, useState } = React

afterEach(() => {
  window.document.head.innerHTML = ''
  window.document.body.innerHTML = '<main></main>'
})

test('renders a simple store', () => {
  let $store = map({ select: 0, ignored: 1 })

  let Test: FC = () => {
    let select = useSelector($store, v => v.select)
    return h('p', { 'data-testid': 'text' }, `Select: ${select}`)
  }

  render(h(Test))
  equal(screen.getByTestId('text').textContent, 'Select: 0')
})

test('only triggers a re-render when selector state is updated', async () => {
  let renders = 0
  let $store = map({ select: 0, ignored: 1 })

  let Test: FC = () => {
    renders += 1
    let select = useSelector($store, v => v.select)

    return h(
      'div',
      {},
      h('p', { 'data-testid': 'select' }, `Select: ${select}`),
      h('button', {
        'data-testid': 'btn-select',
        'onClick': () => {
          $store.set({ ...$store.get(), select: 10 })
        }
      }),
      h('button', {
        'data-testid': 'btn-ignored',
        'onClick': () => {
          $store.set({ ...$store.get(), ignored: 10 })
        }
      })
    )
  }

  render(h(Test))
  equal(screen.getByTestId('select').textContent, 'Select: 0')
  equal(renders, 1)

  await act(async () => {
    screen.getByTestId('btn-select').click()
    await delay(1)
  })

  equal(screen.getByTestId('select').textContent, 'Select: 10')
  equal(renders, 2)

  await act(async () => {
    screen.getByTestId('btn-ignored').click()
    await delay(1)
  })

  equal(renders, 2)
})

test('allows specifying custom equality function', async () => {
  let renders = 0
  let $store = atom({
    array: [
      { select: 0, ignore: 1 },
      { select: 0, ignore: 1 }
    ]
  })

  function deepEqual(objA: unknown, objB: unknown): boolean {
    return JSON.stringify(objA) === JSON.stringify(objB)
  }

  let Test: FC = () => {
    renders += 1
    let store = useSelector(
      $store,
      state => state.array.map(v => ({ select: v.select })),
      { compare: deepEqual }
    )

    let value = store
      .map(item => item.select)
      .reduce((total, num) => total + num, 0)

    return h(
      'div',
      {},
      h('p', { 'data-testid': 'select' }, `Select: ${value}`),
      h('button', {
        'data-testid': 'btn-select',
        'onClick': () => {
          $store.set({
            array: $store.get().array.map(item => ({
              ...item,
              select: item.select + 5
            }))
          })
        }
      }),
      h('button', {
        'data-testid': 'btn-ignored',
        'onClick': () => {
          $store.set({
            array: $store.get().array.map(item => ({
              ...item,
              ignore: item.ignore + 2
            }))
          })
        }
      })
    )
  }

  render(h(Test))
  equal(screen.getByTestId('select').textContent, 'Select: 0')
  equal(renders, 1)

  await act(async () => {
    screen.getByTestId('btn-select').click()
    await delay(1)
  })

  equal(screen.getByTestId('select').textContent, 'Select: 10')
  equal(renders, 2)

  await act(async () => {
    screen.getByTestId('btn-ignored').click()
    await delay(1)
  })

  equal(renders, 2)
})

test('works with computed stores', async () => {
  let $store = atom(0)
  let $computed = computed($store, store => ({ val: store * 2 }))

  let Test: FC = () => {
    let val = useSelector($computed, state => state.val)

    return h(
      'div',
      {},
      h('p', { 'data-testid': 'computed' }, `Computed: ${val}`),
      h('button', {
        'data-testid': 'btn-change',
        'onClick': () => {
          $store.set($store.get() + 1)
        }
      })
    )
  }

  render(h(Test))
  equal(screen.getByTestId('computed').textContent, 'Computed: 0')

  await act(async () => {
    screen.getByTestId('btn-change').click()
    await delay(1)
  })

  equal(screen.getByTestId('computed').textContent, 'Computed: 2')
})

test('reacts to selector function changes and updates if value changes', async () => {
  type Value = {
    a: string
    b: string
  }

  let renders = 0
  let $store = map<Value>({ a: 'valueA', b: 'valueB' })

  let Test: FC = () => {
    renders += 1
    let [useKeyB, setUseKeyB] = useState(false)

    let selector = useKeyB ? (v: Value) => v.b : (v: Value) => v.a
    let value = useSelector($store, selector)

    return h(
      'div',
      {},
      h('p', { 'data-testid': 'value' }, value),
      h('button', {
        onClick: () => {
          setUseKeyB(true)
        }
      })
    )
  }

  render(h(Test))
  equal(screen.getByTestId('value').textContent, 'valueA')
  equal(renders, 1)

  await act(async () => {
    screen.getByRole('button').click()
    await delay(1)
  })

  equal(screen.getByTestId('value').textContent, 'valueB')
  equal(renders, 2)
})

test('support for SSR does not break server behaviour in non-SSR projects', () => {
  type Value = 'new' | 'old'
  let atomStore = atom<Value>('old')
  let mapStore = map<{ value: Value }>({ value: 'old' })

  let atomValues: Uppercase<Value>[] = [] // Track values used across renders

  let AtomTest: FC = () => {
    let value = useSelector(atomStore, v => v.toUpperCase() as Uppercase<Value>)
    atomValues.push(value)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Uppercase<Value>[] = [] // Track values used across renders

  let MapTest: FC = () => {
    let value = useSelector(
      mapStore,
      v => v.value.toUpperCase(),
      // Setting `ssr:false` should be equivalent to not setting `ssr` at all
      { ssr: false }
    )
    mapValues.push(value as Uppercase<Value>)
    return h('div', { 'data-testid': 'map-test' }, value)
  }

  let Wrapper: FC = () => {
    return h('div', { 'data-testid': 'test' }, h(AtomTest), h(MapTest))
  }

  // Simulate store state change on server side
  atomStore.set('new')
  mapStore.set({ value: 'new' })

  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  // Confirm server rendered HTML includes the latest store data
  equal(screen.getByTestId('atom-test').textContent, 'NEW')
  equal(screen.getByTestId('map-test').textContent, 'NEW')
})

test('support SSR to fix client hydration errors, use initial data', t => {
  type Value = 'new' | 'old'
  let atomStore = atom<Value>('old')
  let mapStore = map<{ value: Value }>({ value: 'old' })

  let atomValues: Uppercase<Value>[] = []

  let AtomTest: FC = () => {
    let value = useSelector(atomStore, v => v.toUpperCase(), { ssr: 'initial' })
    atomValues.push(value as Uppercase<Value>)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Uppercase<Value>[] = []

  let MapTest: FC = () => {
    let value = useSelector(mapStore, v => v.value.toUpperCase(), {
      ssr: 'initial'
    })
    mapValues.push(value as Uppercase<Value>)
    return h('div', { 'data-testid': 'map-test' }, value)
  }

  let Wrapper: FC = () => {
    return h('div', { 'data-testid': 'test' }, h(AtomTest), h(MapTest))
  }

  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  equal(screen.getByTestId('atom-test').textContent, 'OLD')
  equal(screen.getByTestId('map-test').textContent, 'OLD')

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
  // render got old values at hydration, then post-hydration render got new values
  deepStrictEqual(atomValues, ['OLD', 'OLD', 'NEW'])
  deepStrictEqual(mapValues, ['OLD', 'OLD', 'NEW'])

  equal(screen.getByTestId('atom-test').textContent, 'NEW')
  equal(screen.getByTestId('map-test').textContent, 'NEW')
})

test('support SSR to fix client hydration errors, server passes data to client', t => {
  type Value = 'initial' | 'update on client' | 'update on server'
  let atomStore = atom<Value>('initial')
  let mapStore = map<{ value: Value }>({ value: 'initial' })

  let ssrDataFnForAtom: typeof atomStore.get | undefined
  let ssrDataFnForMap: typeof mapStore.get | undefined

  let atomValues: Uppercase<Value>[] = [] // Track values used across renders

  let AtomTest: FC = () => {
    let value = useSelector(atomStore, v => v.toUpperCase(), {
      ssr: ssrDataFnForAtom
    })
    atomValues.push(value as Uppercase<Value>)
    return h('div', { 'data-testid': 'atom-test' }, value)
  }

  let mapValues: Uppercase<Value>[] = [] // Track values used across renders

  let MapTest: FC = () => {
    let value = useSelector(mapStore, v => v.value.toUpperCase(), {
      ssr: ssrDataFnForMap
    })
    mapValues.push(value as Uppercase<Value>)
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

  let ssrElement = document.createElement('div')
  document.body.appendChild(ssrElement)
  let html = renderToString(h(Wrapper))
  ssrElement.innerHTML = html

  // Confirm server render includes latest updates to server store
  equal(screen.getByTestId('atom-test').textContent, 'UPDATE ON SERVER')
  equal(screen.getByTestId('map-test').textContent, 'UPDATE ON SERVER')

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
    'UPDATE ON SERVER',
    'UPDATE ON SERVER',
    'UPDATE ON CLIENT'
  ])
  deepStrictEqual(mapValues, [
    'UPDATE ON SERVER',
    'UPDATE ON SERVER',
    'UPDATE ON CLIENT'
  ])

  // Confirm final rendered version has latest updates to client store
  equal(screen.getByTestId('atom-test').textContent, 'UPDATE ON CLIENT')
  equal(screen.getByTestId('map-test').textContent, 'UPDATE ON CLIENT')
})
