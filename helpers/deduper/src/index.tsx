#!/usr/bin/env bun
import meow from 'meow'

import { findDuplicates } from './fclones'
import { formatBytes, pickKeeper, priorityScore } from './priority'

const USAGE_LINE = 'Usage: deduper [flags] [-- <fclones args> --] <dir> [more dirs ...]'

type ParsedArgv = { ok: true; meowArgs: string[]; passthrough: string[] } | { ok: false; message: string }

const parseArgv = (rawArgs: string[]): ParsedArgv => {
  const dashIndices = rawArgs.flatMap((arg, i) => (arg === '--' ? [i] : []))
  if (dashIndices.length === 0) {
    return { ok: true, meowArgs: rawArgs, passthrough: [] }
  }
  if (dashIndices.length === 2) {
    const [first, second] = dashIndices as [number, number]
    return {
      ok: true,
      meowArgs: [...rawArgs.slice(0, first), ...rawArgs.slice(second + 1)],
      passthrough: rawArgs.slice(first + 1, second),
    }
  }
  return { ok: false, message: `expected 0 or 2 '--' separators, got ${dashIndices.length}` }
}

const parsed = parseArgv(Bun.argv.slice(2))
if (!parsed.ok) {
  process.stderr.write(`deduper: ${parsed.message}.\n${USAGE_LINE}\n`)
  process.exit(2)
}
const { meowArgs, passthrough } = parsed

const cli = meow(
  `
  Usage
    $ deduper [flags] [-- <fclones args> --] <dir> [more dirs ...]

  Description
    Finds duplicate files across the given dirs using fclones.
    The first dir is treated as priority — its copies are kept by default,
    duplicates in later dirs are pre-marked for removal in the TUI.

  Options
    --no-tui    Print the would-delete report and exit (no UI, no deletions).
    --json      With --no-tui, emit machine-readable JSON.

  Examples
    $ deduper ~/Pictures ~/Backup/Pictures
    $ deduper -- --min 1M --hidden -- ./a ./b ./c
    $ deduper --no-tui ./a ./b
`,
  {
    importMeta: import.meta,
    argv: meowArgs,
    flags: {
      tui: { type: 'boolean', default: true },
      json: { type: 'boolean', default: false },
    },
  }
)

if (cli.input.length === 0) {
  cli.showHelp(0)
}

const runNoTui = async (dirs: string[], emitJson: boolean): Promise<void> => {
  const report = await findDuplicates(dirs, passthrough)
  const groups = report.groups

  const wasted = groups.reduce((acc, g) => acc + g.file_len * (g.files.length - 1), 0)
  const extras = groups.reduce((acc, g) => acc + g.files.length - 1, 0)

  if (emitJson) {
    const out = {
      dirs,
      passthrough,
      summary: {
        groups: groups.length,
        extra_files: extras,
        wasted_bytes: wasted,
      },
      groups: groups.map((g) => {
        const keeper = pickKeeper(g.files, dirs)
        return {
          file_len: g.file_len,
          file_hash: g.file_hash,
          files: g.files.map((path, i) => ({
            path,
            priority: priorityScore(path, dirs),
            action: i === keeper ? 'keep' : 'drop',
          })),
        }
      }),
    }
    process.stdout.write(JSON.stringify(out, null, 2) + '\n')
    return
  }

  process.stdout.write(`${groups.length} group(s), ${extras} extra file(s), ${formatBytes(wasted)} wasted\n`)
  process.stdout.write(`Priority: ${dirs.join(' > ')}\n`)
  if (groups.length === 0) return

  let willDelete = 0
  let willFree = 0
  groups.forEach((g, gi) => {
    const keeper = pickKeeper(g.files, dirs)
    process.stdout.write(
      `\n[${gi + 1}/${groups.length}] ${formatBytes(g.file_len)} · ${g.files.length} copies · ${g.file_hash.slice(0, 12)}\n`
    )
    g.files.forEach((path, i) => {
      const tag = i === keeper ? 'KEEP*' : 'DROP '
      if (i !== keeper) {
        willDelete++
        willFree += g.file_len
      }
      process.stdout.write(`  ${tag} ${path}\n`)
    })
  })
  process.stdout.write(`\nWould delete ${willDelete} file(s), freeing ${formatBytes(willFree)}.\n`)
}

if (!cli.flags.tui) {
  await runNoTui(cli.input, cli.flags.json)
} else {
  const { render } = await import('ink')
  const { default: App } = await import('./App')
  const React = await import('react')
  render(React.createElement(App, { dirs: cli.input, passthrough }))
}
