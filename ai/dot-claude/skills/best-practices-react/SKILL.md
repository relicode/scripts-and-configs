---
name: best-practices-react
description: React and Next.js performance guide with 28 rules on Suspense, bundle size, server components, client data fetching, re-renders, rendering and browser APIs. Builds on best-practices-bun, which holds the framework-neutral rules such as async waterfalls and hot-path JavaScript. Use when optimizing React apps, reviewing their performance, or refactoring components; preloaded by reviewer-react, reviewer-next, reviewer-astro and dev-next.
license: MIT
---

# React Best Practices - Performance Optimization

Performance optimization guide for React and Next.js applications with 28 rules organized by impact level. It builds on `best-practices-bun`, which holds the rules that apply to any TypeScript: async waterfalls, cross-request caching and hot-path JavaScript.

Forked from Vercel Engineering's react-best-practices v0.1.0 (MIT, January 2026), as vendored from davila7/claude-code-templates at `b84033e`. `LICENSE.txt` in this folder carries the license notice.

## When to use this skill

**Use React Best Practices when:**
- Optimizing React or Next.js application performance
- Reviewing code for performance improvements
- Refactoring existing components for better performance
- Implementing new features with performance in mind
- Debugging slow rendering or loading issues
- Reducing bundle size
- Eliminating request waterfalls, together with `best-practices-bun`

**Key areas covered:**
- **Eliminating Waterfalls** (CRITICAL): Stream content with Suspense instead of blocking on data
- **Bundle Size Optimization** (CRITICAL): Reduce initial JavaScript payload
- **Server-Side Performance** (HIGH): Optimize RSC and data fetching
- **Client-Side Data Fetching** (MEDIUM-HIGH): Implement efficient caching
- **Re-render Optimization** (MEDIUM): Minimize unnecessary re-renders
- **Rendering Performance** (MEDIUM): Optimize browser rendering
- **Browser APIs** (LOW-MEDIUM): Batch DOM style changes and cache storage reads
- **Advanced Patterns** (LOW): Specialized techniques for edge cases

## Quick reference

### Critical priorities

1. **Avoid barrel imports** - Import directly from source files
2. **Dynamic imports** - Lazy-load heavy components
3. **Strategic Suspense** - Stream content while showing layout
4. **No async waterfalls** - Defer awaits and run independent work with `Promise.all()`, as `best-practices-bun` describes

### Common patterns

**Direct imports:**
```tsx
// ❌ Loads entire library
import { Check } from 'lucide-react'

// ✅ Loads only what you need
import Check from 'lucide-react/dist/esm/icons/check'
```

**Dynamic components:**
```tsx
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('./monaco-editor'),
  { ssr: false }
)
```

## Using the guidelines

The complete performance guidelines are available in the references folder:

- **react-performance-guidelines.md**: Complete guide with all 28 rules, code examples, and impact analysis

Each rule includes:
- Incorrect/correct code comparisons
- Specific impact metrics
- When to apply the optimization
- Real-world examples

## Categories overview

### 1. Eliminating Waterfalls (CRITICAL)
Waterfalls are the #1 performance killer. Each sequential await adds full network latency. The framework-neutral rules are in `best-practices-bun`; this guide adds:
- Strategic Suspense boundaries

### 2. Bundle Size Optimization (CRITICAL)
Reducing initial bundle size improves Time to Interactive and Largest Contentful Paint.
- Avoid barrel file imports
- Conditional module loading
- Defer non-critical third-party libraries
- Dynamic imports for heavy components
- Preload based on user intent

### 3. Server-Side Performance (HIGH)
Optimize server-side rendering and data fetching. Caching across requests is in `best-practices-bun`.
- Minimize serialization at RSC boundaries
- Parallel data fetching with component composition
- Per-request deduplication with React.cache()

### 4. Client-Side Data Fetching (MEDIUM-HIGH)
Automatic deduplication and efficient data fetching patterns.
- Deduplicate global event listeners
- Use SWR for automatic deduplication

### 5. Re-render Optimization (MEDIUM)
Reduce unnecessary re-renders to minimize wasted computation.
- Defer state reads to usage point
- Extract to memoized components
- Narrow effect dependencies
- Subscribe to derived state
- Use lazy state initialization
- Use transitions for non-urgent updates

### 6. Rendering Performance (MEDIUM)
Optimize the browser rendering process.
- Animate SVG wrapper instead of SVG element
- CSS content-visibility for long lists
- Hoist static JSX elements
- Optimize SVG precision
- Prevent hydration mismatch without flickering
- Use Activity component for show/hide
- Use explicit conditional rendering

### 7. Browser APIs (LOW-MEDIUM)
Synchronous browser calls in hot paths. The general hot-path rules are in `best-practices-bun`.
- Batch DOM CSS changes
- Cache storage API calls

### 8. Advanced Patterns (LOW)
Specialized techniques for edge cases.
- Store event handlers in refs
- useLatest for stable callback refs

## Implementation approach

When optimizing a React application:

1. **Profile first**: Use React DevTools Profiler and browser performance tools to identify bottlenecks
2. **Focus on critical paths**: Start with eliminating waterfalls and reducing bundle size
3. **Measure impact**: Verify improvements with metrics (LCP, TTI, FID)
4. **Apply incrementally**: Don't over-optimize prematurely
5. **Test thoroughly**: Ensure optimizations don't break functionality

## Key metrics to track

- **Time to Interactive (TTI)**: When page becomes fully interactive
- **Largest Contentful Paint (LCP)**: When main content is visible
- **First Input Delay (FID)**: Responsiveness to user interactions
- **Cumulative Layout Shift (CLS)**: Visual stability
- **Bundle size**: Initial JavaScript payload
- **Server response time**: TTFB for server-rendered content

## Common pitfalls to avoid

❌ **Don't:**
- Use barrel imports from large libraries
- Re-render entire trees when only part needs updating
- Load analytics/tracking in the critical path
- Create RegExp or heavy objects inside render

✅ **Do:**
- Import directly from source files
- Memoize expensive components
- Lazy-load non-critical code
- Hoist static objects outside components

The framework-neutral pitfalls, such as sequential awaits and `sort()` mutating arrays, are in `best-practices-bun`.

## Resources

- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org)
- [SWR Documentation](https://swr.vercel.app)
- [Vercel Bundle Optimization](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
- [Vercel Dashboard Performance](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
- [better-all Library](https://github.com/shuding/better-all)
- [node-lru-cache](https://github.com/isaacs/node-lru-cache)
