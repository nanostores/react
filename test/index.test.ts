import type { FC, ReactNode } from 'react'

import './setup.js'
import { STORE_UNMOUNT_DELAY, onMount, atom, map, computed } from 'nanostores'
import { render, act, screen } from '@testing-library/react'
import { equal, is } from 'uvu/assert'
import { delay } from 'nanodelay'
import { test } from 'uvu'
import React from 'react'

import { useStore } from '../index.js'

let { createElement: h, useState } = React

test.after.each(() => {
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

  is.not(screen.queryByTestId('test1'), null)
  act(() => {
    screen.getByRole('button').click()
  })
  is(screen.queryByTestId('test1'), null)
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
  is(screen.queryByTestId('test'), null)
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

test('works with stores that set their values in lifecycle hooks', async () => {
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

test.run()
