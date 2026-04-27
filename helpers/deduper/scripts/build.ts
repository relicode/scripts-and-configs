import { rm } from 'node:fs/promises'

import stubReactDevtools from './stub-react-devtools'

const targets = [
  { target: 'bun-linux-x64', outfile: 'dist/deduper-linux-x64' },
  { target: 'bun-linux-arm64', outfile: 'dist/deduper-linux-arm64' },
  { target: 'bun-darwin-x64', outfile: 'dist/deduper-darwin-x64' },
  { target: 'bun-darwin-arm64', outfile: 'dist/deduper-darwin-arm64' },
] as const

await rm('dist', { recursive: true, force: true })

const buildOne = async ({ target, outfile }: (typeof targets)[number]) => {
  const result = await Bun.build({
    entrypoints: ['src/index.tsx'],
    target: 'bun',
    minify: true,
    // With `compile`, Bun embeds a zstd sourcemap inside each binary so
    // stacktraces still resolve; the external `dist/index.js.map` side-effect
    // is cleaned up after the parallel builds complete.
    sourcemap: 'linked',
    plugins: [stubReactDevtools],
    compile: { target, outfile },
  })

  if (!result.success) {
    for (const log of result.logs) console.error(log)
    throw new Error(`Build failed for ${target}`)
  }

  console.log(`Built ${outfile}`)
}

const results = await Promise.allSettled(targets.map(buildOne))
const failed = results.flatMap((r, i) => {
  if (r.status !== 'rejected') return []
  const t = targets[i]
  return t ? [{ target: t.target, reason: r.reason }] : []
})

// All four parallel builds race to write the same `dist/index.js.map` (the
// external sibling map for the bundled entrypoint). The binaries themselves
// embed their own sourcemap, so the external file is dead weight — drop it.
await rm('dist/index.js.map', { force: true })

if (failed.length > 0) {
  for (const { target, reason } of failed) {
    console.error(`✗ ${target}:`, reason instanceof Error ? reason.message : reason)
  }
  console.error(`${failed.length} of ${targets.length} targets failed`)
  process.exit(1)
}
