# Nano Stores React

<img align="right" width="92" height="92" title="Nano Stores logo"
     src="https://nanostores.github.io/nanostores/logo.svg">

React integration for **[Nano Stores]**, a tiny state manager
with many atomic tree-shakable stores.

- **Small.** Less than 1 KB. Zero dependencies.
- **Fast.** With small atomic and derived stores, you do not need to call
  the selector function for all components on every store change.
- **Tree Shakable.** The chunk contains only stores used by components
  in the chunk.
- Was designed to move logic from components to stores.
- It has good **TypeScript** support.

```tsx
import { useStore } from '@nanostores/react'
import { $profile } from '../stores/profile.js'

export const Header = ({ postId }) => {
  const profile = useStore($profile)
  return <header>Hi, {profile.name}</header>
}
```

[Nano Stores]: https://github.com/nanostores/nanostores/

---

<img src="https://cdn.evilmartians.com/badges/logo-no-label.svg" alt="" width="22" height="16" /> Made at <b><a href="https://evilmartians.com/devtools?utm_source=nanostores-react&utm_campaign=devtools-button&utm_medium=github">Evil Martians</a></b>, product consulting for <b>developer tools</b>.

---


## Options

### Keys

Use the `keys` option to re-render only on specific key changes:

```tsx
export const Header = () => {
  const profile = useStore($profile, { keys: 'name' })
  return <header>{profile.name}</header>
}
```

### SSR

SSR could be very complicated in React. To avoid hydration errors you
need exactly the same stores state in the end of server HTML rendering
and during the first DOM render on the client.

For simple solution you can disable any store update on the server
by `ssr: 'initial'`:

```tsx
export const Header = () => {
  const profile = useStore($profile, { ssr: 'initial' })
  // Hydrate with initial profile, then render latest client-side value
  return <header>{profile.name}</header>
}
```

For advanced cases where you update store values on the server before SSR, and need pages to hydrate with the updated value from the server, set a function that returns the server state: `ssr: () => serverState`.

```tsx
// Value of store on server at time of SSR, passed to client somehow...
const profileFromServer = { name: 'A User' }

export const Header = () => {
  const profile = useStore($profile, {
    ssr:
      typeof window === 'undefined'
        ? // On server, always use up-to-date store value (no SSR handling)
          false
        : // On client, set server value to avoid error on hydration
          () => profileFromServer
  })
  // Hydrate with profile at time of SSR, then render latest client-side value
  return <header>{profile.name}</header>
}
```

A function set on `ssr` is provided to React's [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
as the `getServerSnapshot` option.
