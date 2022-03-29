import './setup.js'
import {
  STORE_UNMOUNT_DELAY,
  mapTemplate,
  onMount,
  atom,
  map
} from 'nanostores'
import { render, act, screen } from '@testing-library/react'
import React, { FC } from 'react'
import { equal, is } from 'uvu/assert'
import { delay } from 'nanodelay'
import { test } from 'uvu'

import { useStore } from '../index.js'

let { createElement: h, useState } = React

test.after.each(() => {
  window.document.head.innerHTML = ''
  window.document.body.innerHTML = '<main></main>'
})

function getCatcher(cb: () => void): [string[], FC] {
  let errors: string[] = []
  let Catcher: FC = () => {
    try {
      cb()
    } catch (e) {
      if (e instanceof Error) errors.push(e.message)
    }
    return null
  }
  return [errors, Catcher]
}

test('throws on template instead of store', () => {
  let Test = (): void => {}
  let [errors, Catcher] = getCatcher(() => {
    // @ts-expect-error
    useStore(Test, 'ID')
  })
  render(h(Catcher))
  equal(errors, [
    'Use useStore(Template(id)) or useSync() ' +
      'from @logux/client/react for templates'
  ])
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
  let simple = atom<string>()

  onMount(simple, () => {
    simple.set('S')
    return () => {
      destroyed += 'S'
    }
  })

  let Map = mapTemplate<{ id: string }>((store, id) => {
    return () => {
      destroyed += id
    }
  })

  let TestA: FC = () => {
    let simpleValue = useStore(simple)
    let { id } = useStore(Map('M'))
    return h('div', { 'data-testid': 'test' }, `1 ${simpleValue} ${id}`)
  }

  let TestB: FC = () => {
    let simpleValue = useStore(simple)
    let { id } = useStore(Map('M'))
    return h('div', { 'data-testid': 'test' }, `2 ${simpleValue} ${id}`)
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
  equal(screen.getByTestId('test').textContent, '1 S M')

  act(() => {
    screen.getByRole('button').click()
  })
  equal(screen.getByTestId('test').textContent, '2 S M')
  equal(destroyed, '')

  act(() => {
    screen.getByRole('button').click()
  })
  is(screen.queryByTestId('test'), null)
  equal(destroyed, '')

  await delay(STORE_UNMOUNT_DELAY)
  equal(destroyed, 'SM')
})

test('handles keys option', async () => {
  type MapStore = {
    a?: string
    b?: string
  }
  let Wrapper: FC = ({ children }) => h('div', {}, children)
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

test.run()
