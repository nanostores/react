# Nano Stores React

<img align="right" width="92" height="92" title="Nano Stores logo"
     src="https://nanostores.github.io/nanostores/logo.svg">

React integration for **[Nano Stores]**, a tiny state manager
with many atomic tree-shakable stores.

- **Small.** Around 1 KB. Zero dependencies.
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

<img src="https://cdn.evilmartians.com/badges/logo-no-label.svg" alt="" width="22" height="16" />  Nano Stores React is built by <b><a href="https://evilmartians.com/">Evil Martians</a></b>, an American design and engineering consultancy for <b>developer tools, AI, and cybersecurity startups</b>.

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

Listening to a base key will automatically trigger a re-render
if any of its nested properties mutate.

```tsx
// Will listen for all changes in profile object
const profile = useStore($profile, { keys: ['profile'] })
```

### Loading

`useLoadingStore()` suspends the component while the store is loading.
It supports both loading formats: the state machine of [`@nanostores/async`]
and the `isLoading` key of [Logux Client] and [Nano Stores SQL].

```ts
// stores/user.ts
import { computedAsync } from '@nanostores/async'
import { atom } from 'nanostores'

export const $userId = atom('user-1')

export const $user = computedAsync($userId, userId => {
  return fetch(`/api/users/${userId}`).then(response => response.json())
})
```

While the store is in the `loading` state, React will render the closest
`<Suspense>` fallback. In the `failed` state, the error will be thrown
to the closest error boundary. As a result, the component gets the loaded
value without the `AsyncValue` wrapper.

```tsx
import { useLoadingStore } from '@nanostores/react'
import { Suspense } from 'react'

import { $user } from '../stores/user.js'

const UserName = () => {
  // TypeScript knows that the user is loaded and has no error here
  const user = useLoadingStore($user)
  return <h1>{user.name}</h1>
}

export const Page = () => (
  <ErrorBoundary fallback={<LoadingError />}>
    <Suspense fallback={<Spinner />}>
      <UserName />
    </Suspense>
  </ErrorBoundary>
)
```

React has no built-in error boundary. You can write your own class component
or take [`react-error-boundary`].

[`react-error-boundary`]: https://github.com/bvaughn/react-error-boundary
[`@nanostores/async`]: https://github.com/nanostores/async
[Nano Stores SQL]: https://github.com/nanostores/sql
[Logux Client]: https://github.com/logux/client

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
