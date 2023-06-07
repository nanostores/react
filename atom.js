import { atom } from 'nanostores'
import { useStore } from "."

export const atom = (value) => {
  const store = atom(value)
  return Object.assign(store, { sub: () => useStore(store) })
}