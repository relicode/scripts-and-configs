# TypeScript Performance Guidelines

Rules for TypeScript and JavaScript wherever they run: Bun scripts and servers, Node, browsers and React apps. React and Next.js specifics are in `best-practices-react`.

Adapted from Vercel Engineering's react-best-practices (MIT, January 2026), via davila7/claude-code-templates at `b84033e`; see `LICENSE.txt` in the skill folder. The examples follow the house rules: arrow functions, inferred types, `undefined` rather than `null`, and no mutated inputs.

---

## Contents

1. [Eliminating Waterfalls](#1-eliminating-waterfalls) — **CRITICAL**
   - 1.1 Defer Await Until Needed
   - 1.2 Start Dependent Work as Early as Possible
   - 1.3 Start Independent Work at Once in Request Handlers
   - 1.4 Promise.all() for Independent Operations
2. [Caching Across Requests](#2-caching-across-requests) — **HIGH**
   - 2.1 Use a Bounded LRU Cache
3. [Hot Paths](#3-hot-paths) — **LOW-MEDIUM**
   - 3.1 Index Maps for Repeated Lookups
   - 3.2 Read Nested Properties Once
   - 3.3 Memoize Repeated Pure Calls
   - 3.4 One Pass Instead of Several
   - 3.5 Compare Lengths First
   - 3.6 Return as Soon as the Result Is Known
   - 3.7 Hoist Regular Expressions
   - 3.8 One Pass for Min and Max
   - 3.9 Set and Map for Membership Checks
   - 3.10 toSorted() Instead of sort()

---

## 1. Eliminating Waterfalls

**Impact: CRITICAL**

Each sequential `await` adds the full latency of whatever it waits for. Removing waterfalls usually beats every other optimization.

### 1.1 Defer Await Until Needed

Move an `await` into the branch that uses its result, so paths that don't need the value don't wait for it.

**Incorrect: both branches wait for the user data**

```ts
const handleRequest = async (userId: string, shouldSkip: boolean) => {
  const userData = await fetchUserData(userId)
  if (shouldSkip) return { isSkipped: true }
  return processUserData(userData)
}
```

**Correct: only the branch that uses it waits**

```ts
const handleRequest = async (userId: string, shouldSkip: boolean) => {
  if (shouldSkip) return { isSkipped: true }
  return processUserData(await fetchUserData(userId))
}
```

The same goes for early returns: fetch what the check needs first, and the rest after it.

**Incorrect: fetches permissions even when the resource doesn't exist**

```ts
const updateResource = async (resourceId: string, userId: string) => {
  const permissions = await fetchPermissions(userId)
  const resource = await getResource(resourceId)
  if (!resource) return { error: 'Not found' }
  if (!permissions.canEdit) return { error: 'Forbidden' }
  return updateResourceData(resource, permissions)
}
```

**Correct: fetches permissions only once the resource exists**

```ts
const updateResource = async (resourceId: string, userId: string) => {
  const resource = await getResource(resourceId)
  if (!resource) return { error: 'Not found' }
  const permissions = await fetchPermissions(userId)
  if (!permissions.canEdit) return { error: 'Forbidden' }
  return updateResourceData(resource, permissions)
}
```

This pays off most when the early-return path is common or the deferred call is slow.

### 1.2 Start Dependent Work as Early as Possible

When some operations depend on others, start each one as soon as its own inputs are ready, not when a whole batch is done. [better-all](https://github.com/shuding/better-all) does this for you: it starts every task at the earliest possible moment.

**Incorrect: the profile waits for a config it doesn't need**

```ts
const [user, config] = await Promise.all([fetchUser(), fetchConfig()])
const profile = await fetchProfile(user.id)
```

**Correct: the config and the profile run in parallel**

```ts
import { all } from 'better-all'

const { user, config, profile } = await all({
  async user() {
    return fetchUser()
  },
  async config() {
    return fetchConfig()
  },
  async profile() {
    return fetchProfile((await this.$.user).id)
  },
})
```

The tasks are methods because better-all lets them reach each other through `this`. For a single dependency, a helper does the same without the library:

```ts
const fetchProfileFor = async (user: Promise<User>) => fetchProfile((await user).id)

const userPromise = fetchUser()
const [user, config, profile] = await Promise.all([userPromise, fetchConfig(), fetchProfileFor(userPromise)])
```

### 1.3 Start Independent Work at Once in Request Handlers

In request handlers, such as `Bun.serve` routes, API routes and server actions, start independent operations immediately, even when something else has to finish first.

**Incorrect: the config waits for auth, and the data waits for both**

```ts
const handleGet = async (request: Request) => {
  const session = await auth(request)
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct: auth and the config start together, and the data starts as soon as auth is done**

```ts
const fetchDataFor = async (session: Promise<Session>) => fetchData((await session).user.id)

const handleGet = async (request: Request) => {
  const [config, data] = await Promise.all([fetchConfig(), fetchDataFor(auth(request))])
  return Response.json({ data, config })
}
```

Every promise you start has to end up awaited or handled. A promise started early rejects unhandled if it fails while you're still awaiting something else (Node and Bun then exit), or if that other `await` throws and you never get back to it. Funnel early starts into one `Promise.all()`, as above: it handles all of them from the start.

### 1.4 Promise.all() for Independent Operations

When async operations don't depend on each other, run them concurrently.

**Incorrect: three round trips, one after another**

```ts
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()
```

**Correct: the three run at once**

```ts
const [user, posts, comments] = await Promise.all([fetchUser(), fetchPosts(), fetchComments()])
```

---

## 2. Caching Across Requests

**Impact: HIGH**

### 2.1 Use a Bounded LRU Cache

A per-request cache doesn't help when sequential requests need the same data, for example when a user clicks one button and then another. Keep that data in an LRU cache with limits on its size and age.

```ts
import { LRUCache } from 'lru-cache'

const MAX_CACHED_USERS = 1000
const USER_TTL_MS = 5 * 60 * 1000

// A cache is a service like a logger: one instance, bounded in size and age.
const users = new LRUCache<string, User>({ max: MAX_CACHED_USERS, ttl: USER_TTL_MS })

export const getUser = async (id: string) => {
  const cached = users.get(id)
  if (cached) return cached
  const user = (await db.user.findUnique({ where: { id } })) ?? undefined
  if (user) users.set(id, user)
  return user
}
```

The database client returns `null` for a missing row; `?? undefined` keeps that `null` at the boundary.

Use it when sequential actions hit several endpoints that need the same data within seconds. With several server processes, or in serverless, a per-process cache mostly misses: use a shared one such as Redis (`Bun.redis` on Bun).

---

## 3. Hot Paths

**Impact: LOW-MEDIUM**

These pay off in code that runs often: loops over large data, handlers under load, render paths. Elsewhere, write whatever reads most clearly. The exception is 3.10, which applies everywhere: mutating a caller's array is a bug, not a speed issue.

### 3.1 Index Maps for Repeated Lookups

Several `find()` calls by the same key should use a `Map`.

**Incorrect: O(n) per lookup**

```ts
const attachUsers = (orders: Order[], users: User[]) =>
  orders.map((order) => ({ ...order, user: users.find((user) => user.id === order.userId) }))
```

**Correct: the map is built once, then each lookup is O(1)**

```ts
const attachUsers = (orders: Order[], users: User[]) => {
  const userById = new Map(users.map((user) => [user.id, user]))
  return orders.map((order) => ({ ...order, user: userById.get(order.userId) }))
}
```

For 1,000 orders and 1,000 users, that's about 2,000 operations instead of a million.

### 3.2 Read Nested Properties Once

Read a nested property before the loop instead of on every iteration.

**Incorrect: three property reads per item**

```ts
const sizes = items.map((item) => Math.min(item.size, options.settings.limits.max))
```

**Correct: one read in total**

```ts
const { max } = options.settings.limits
const sizes = items.map((item) => Math.min(item.size, max))
```

### 3.3 Memoize Repeated Pure Calls

When a pure function keeps running with the same input, keep its results in a `Map`, wrapped in a closure so nothing else can reach it.

**Incorrect: slugifies the same names on every call**

```ts
const toCard = (project: Project) => ({ ...project, slug: slugify(project.name) })
```

**Correct: each name is slugified once**

```ts
const memoize = <T>(compute: (key: string) => T) => {
  const results = new Map<string, T>()
  return (key: string) => {
    const cached = results.get(key)
    if (cached !== undefined) return cached
    const result = compute(key)
    results.set(key, result)
    return result
  }
}

const slugifyOnce = memoize(slugify)
const toCard = (project: Project) => ({ ...project, slug: slugifyOnce(project.name) })
```

A result of `undefined` isn't cached, which is fine for functions like `slugify` that always return a value. The map grows with every new key, so when keys come from user input, use a bounded cache (2.1) instead.

### 3.4 One Pass Instead of Several

Several `filter()` or `map()` calls over the same array walk it several times. In a hot path, combine them into one loop.

**Incorrect: three passes**

```ts
const admins = users.filter((user) => user.isAdmin)
const testers = users.filter((user) => user.isTester)
const inactive = users.filter((user) => !user.isActive)
```

**Correct: one pass**

```ts
const admins: User[] = []
const testers: User[] = []
const inactive: User[] = []
for (const user of users) {
  if (user.isAdmin) admins.push(user)
  if (user.isTester) testers.push(user)
  if (!user.isActive) inactive.push(user)
}
```

The empty arrays are annotated so their types are clear where they're declared.

### 3.5 Compare Lengths First

When comparing arrays expensively (sorting, deep equality, serialization), check the lengths first: arrays of different lengths can't be equal.

**Incorrect: sorts and joins even when the lengths differ, and sorts the caller's arrays in place**

```ts
const hasChanges = (current: string[], original: string[]) => current.sort().join() !== original.sort().join()
```

**Correct: an O(1) check first, then sorted copies**

```ts
const hasChanges = (current: string[], original: string[]) => {
  if (current.length !== original.length) return true
  const originalSorted = original.toSorted()
  return current.toSorted().some((value, index) => value !== originalSorted[index])
}
```

### 3.6 Return as Soon as the Result Is Known

**Incorrect: keeps checking after the first error**

```ts
const validateUsers = (users: User[]) => {
  let error = ''
  for (const user of users) {
    if (!user.email) error = 'Email required'
    if (!user.name) error = 'Name required'
  }
  return error ? { isValid: false, error } : { isValid: true }
}
```

**Correct: returns at the first error**

```ts
const validateUsers = (users: User[]) => {
  for (const user of users) {
    if (!user.email) return { isValid: false, error: 'Email required' }
    if (!user.name) return { isValid: false, error: 'Name required' }
  }
  return { isValid: true }
}
```

### 3.7 Hoist Regular Expressions

Don't build the same regular expression on every call or for every item: hoist a fixed pattern to a module-level constant.

**Incorrect: builds a new RegExp on every call**

```ts
const isSlug = (text: string) => new RegExp('^[a-z0-9-]+$').test(text)
```

**Correct: built once**

```ts
const SLUG_PATTERN = /^[a-z0-9-]+$/
const isSlug = (text: string) => SLUG_PATTERN.test(text)
```

A pattern built from input can't be hoisted, but build it once per input, not once per item; in a React component, build one that depends on props or state in `useMemo`. Keep `test()` and `exec()` off a shared pattern with the `g` or `y` flag: they advance its `lastIndex`, so the next call starts partway through the string, and `matchAll()` inherits that position. Drop the flag for yes/no checks, and walk matches with `text.matchAll(PATTERN)` instead of an `exec()` loop.

### 3.8 One Pass for Min and Max

Finding the smallest or largest item takes one pass; sorting does far more work.

**Incorrect: O(n log n) to find one item**

```ts
const findLatest = (projects: Project[]) => projects.toSorted((a, b) => b.updatedAt - a.updatedAt)[0]
```

**Correct: O(n)**

```ts
const findLatest = (projects: Project[]) =>
  projects.length === 0
    ? undefined
    : projects.reduce((latest, project) => (project.updatedAt > latest.updatedAt ? project : latest))
```

To find the oldest and the newest together, track both in the same pass.

### 3.9 Set and Map for Membership Checks

Turn an array into a `Set`, or a `Map` when you need values, before checking membership repeatedly.

**Incorrect: O(n) per check**

```ts
const ALLOWED_IDS = ['a', 'b', 'c']
const allowedItems = items.filter((item) => ALLOWED_IDS.includes(item.id))
```

**Correct: O(1) per check**

```ts
const ALLOWED_IDS = new Set(['a', 'b', 'c'])
const allowedItems = items.filter((item) => ALLOWED_IDS.has(item.id))
```

### 3.10 toSorted() Instead of sort()

`sort()` sorts in place, so it changes an array the caller still holds, which is a bug. `toSorted()` returns a sorted copy; that copy is the price of not mutating, and it applies everywhere, not just in hot paths.

**Incorrect: reorders the caller's array**

```ts
const sortByName = (users: User[]) => users.sort((a, b) => a.name.localeCompare(b.name))
```

**Correct: leaves it alone**

```ts
const sortByName = (users: User[]) => users.toSorted((a, b) => a.name.localeCompare(b.name))
```

The same goes for `reverse()` and `splice()`: use `toReversed()` and `toSpliced()`. On a runtime without them, copy first: `[...users].sort(...)`.

---

## References

1. [https://github.com/shuding/better-all](https://github.com/shuding/better-all)
2. [https://github.com/isaacs/node-lru-cache](https://github.com/isaacs/node-lru-cache)
3. [https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
