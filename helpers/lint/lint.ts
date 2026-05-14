#!/usr/bin/env bun
import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { $ } from 'bun'

// `with { type: 'file' }` makes Bun emit an absolute path string at runtime
// (and embed the file as an asset in `bun build --compile` binaries). TS sees
// the module's default export instead, so narrow back to `string` here.
import FALLBACK_ESLINT_RAW from './eslint.config.js' with { type: 'file' }
import FALLBACK_PRETTIER_RAW from './prettier.config.mjs' with { type: 'file' }
import FALLBACK_TSCONFIG_RAW from './tsconfig.fallback.json' with { type: 'file' }

const FALLBACK_ESLINT = FALLBACK_ESLINT_RAW as unknown as string
const FALLBACK_PRETTIER = FALLBACK_PRETTIER_RAW as unknown as string
const FALLBACK_TSCONFIG = FALLBACK_TSCONFIG_RAW as unknown as string

const SCRIPT_DIR = import.meta.dir
const isTTY = process.stdout.isTTY

// Prefer the helper's own tools (prettier, eslint, concurrently, tsc, jiti)
// over anything that happens to be on PATH from the caller's environment.
process.env.PATH = `${SCRIPT_DIR}/node_modules/.bin:${process.env.PATH ?? ''}`

// concurrently pipes child stdout/stderr, so the children think they're not
// on a TTY and drop color. Force it on when we ourselves are on a TTY.
if (isTTY) process.env.FORCE_COLOR ??= '1'

const args = process.argv.slice(2)
const format = args.includes('-f') || args.includes('--format')
const help = args.includes('-h') || args.includes('--help')
const positionals = args.filter((a) => !a.startsWith('-'))
const targets = positionals.length > 0 ? positionals : ['.']

const c = {
  bold: isTTY ? '\x1b[1m' : '',
  dim: isTTY ? '\x1b[2m' : '',
  cyan: isTTY ? '\x1b[36m' : '',
  yellow: isTTY ? '\x1b[33m' : '',
  green: isTTY ? '\x1b[32m' : '',
  reset: isTTY ? '\x1b[0m' : '',
}

if (help) {
  console.log(`${c.bold}lint${c.reset} — run ${c.cyan}eslint${c.reset}, ${c.yellow}prettier${c.reset}, and (when present) ${c.green}tsc${c.reset} concurrently

${c.bold}Usage:${c.reset}
  ${c.bold}lint${c.reset} [${c.cyan}options${c.reset}] [${c.green}paths…${c.reset}]

${c.bold}Options:${c.reset}
  ${c.cyan}-f${c.reset}, ${c.cyan}--format${c.reset}    format mode: ${c.yellow}eslint --fix${c.reset} + ${c.yellow}prettier --write${c.reset} (sequential)
  ${c.cyan}-h${c.reset}, ${c.cyan}--help${c.reset}      show this help

${c.bold}Lint mode${c.reset} (default): ${c.yellow}eslint${c.reset} + ${c.yellow}prettier --check${c.reset} + ${c.yellow}tsc --noEmit${c.reset} (concurrent)

${c.dim}Paths default to ${c.reset}${c.bold}.${c.reset}${c.dim} (cwd) when omitted. tsc honors them by writing a temporary
tsconfig that ${c.reset}${c.bold}extends${c.reset}${c.dim} cwd's tsconfig.json (or the bundled fallback) with
${c.reset}${c.bold}include = <paths>${c.reset}${c.dim}. tsc runs when cwd has a tsconfig OR a positional path looks like a TS file.${c.reset}

${c.bold}Config resolution:${c.reset} repo-local prettier/eslint configs take precedence. Falls back to:
  ${c.dim}${FALLBACK_PRETTIER}${c.reset}
  ${c.dim}${FALLBACK_ESLINT}${c.reset}
  ${c.dim}${FALLBACK_TSCONFIG}${c.reset}

${c.dim}Bundled binaries live in ${SCRIPT_DIR}/node_modules/.bin/ and are preferred over $PATH.${c.reset}`)
  process.exit(0)
}

const PRETTIER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.ts',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.js',
  'prettier.config.mjs',
  'prettier.config.cjs',
  'prettier.config.ts',
]

const ESLINT_CONFIG_FILES = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yaml',
  '.eslintrc.yml',
]

const fileExists = (path: string) => Bun.file(path).exists()
const anyExists = async (paths: string[]) => (await Promise.all(paths.map(fileExists))).some(Boolean)

type PackageJson = { prettier?: unknown; eslintConfig?: unknown }
const pkg: PackageJson | null = await Bun.file('package.json')
  .json()
  .catch(() => null)

const [hasLocalPrettier, hasLocalEslint, hasTsconfig] = await Promise.all([
  (async () => (await anyExists(PRETTIER_CONFIG_FILES)) || pkg?.prettier !== undefined)(),
  (async () => (await anyExists(ESLINT_CONFIG_FILES)) || pkg?.eslintConfig !== undefined)(),
  fileExists('tsconfig.json'),
])

// concurrently passes each command string to `sh -c`, so any path-bearing
// token must be shell-quoted to survive spaces or metacharacters.
const shellJoin = (parts: string[]) => parts.map((p) => $.escape(p)).join(' ')
const eslintCmd = (extra: string[]) =>
  shellJoin(['eslint', ...(hasLocalEslint ? [] : ['--config', FALLBACK_ESLINT]), ...extra, ...targets])
const prettierCmd = (mode: '--check' | '--write') =>
  shellJoin(['prettier', ...(hasLocalPrettier ? [] : ['--config', FALLBACK_PRETTIER]), mode, ...targets])

// Decide whether tsc should run, and with what config:
//  - cwd tsconfig + no positionals → native `tsc --noEmit` (preserves include/exclude).
//  - cwd tsconfig + positionals    → temp tsconfig extends cwd's, narrows include.
//  - no cwd tsconfig + .ts position → temp tsconfig extends bundled fallback, narrows include.
//  - no cwd tsconfig + no positional → skip tsc (would need to scan cwd to know if any TS exists).
// Vanilla `tsc --noEmit <files>` ignores tsconfig.json (TypeScript's documented
// behavior), losing strict/target/paths/etc. The temp-tsconfig dance emulates
// `tsc-files` and is cleaned up on exit.
const TS_FILE_RE = /\.(tsx?|mts|cts)$/
const positionalsLookTs = positionals.some((p) => TS_FILE_RE.test(p))
const shouldRunTsc = hasTsconfig || positionalsLookTs

// When extending the bundled fallback (consumer has no cwd tsconfig and presumably
// no @types/* either), point `typeRoots` at a real on-disk @types dir so consumers
// don't need their own. In source mode this is SCRIPT_DIR/node_modules/@types; in
// `bun build --compile` binary mode, SCRIPT_DIR is the virtual `/$bunfs/root/…`
// asset path with no @types, so fall back to `process.execPath`-adjacent
// node_modules/@types (matches the README's "keep dist/lint and node_modules
// together" guidance). If neither exists, omit typeRoots and let tsc complain
// loudly — better than silently typing as `any`.
const resolveBundledTypeRoots = (): string | undefined => {
  const candidates = [`${SCRIPT_DIR}/node_modules/@types`, `${resolve(process.execPath, '..')}/node_modules/@types`]
  return candidates.find((p) => existsSync(p))
}

type TempTsconfig = {
  extends: string
  include: string[]
  compilerOptions?: { typeRoots: string[] }
}

const registerTempTsconfigCleanup = (path: string) => {
  const cleanup = () => {
    try {
      unlinkSync(path)
    } catch {
      // best-effort: file may already be gone, or cwd may be read-only by now
    }
  }
  process.on('exit', cleanup)
  // `exit` doesn't fire on signals or uncaught exceptions. Wire those up too so
  // a Ctrl-C mid-tsc doesn't leave the temp file lying around.
  const onSignal = (sig: NodeJS.Signals) => {
    cleanup()
    // Re-raise with the conventional 128+signo exit code.
    process.exit(128 + (sig === 'SIGINT' ? 2 : sig === 'SIGTERM' ? 15 : sig === 'SIGHUP' ? 1 : 0))
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  process.once('SIGHUP', onSignal)
  process.once('uncaughtException', (err) => {
    cleanup()
    console.error(err)
    process.exit(1)
  })
}

const buildTscCmd = async () => {
  if (hasTsconfig && positionals.length === 0) return shellJoin(['tsc', '--noEmit'])
  const cwd = process.cwd()
  const base = hasTsconfig ? './tsconfig.json' : FALLBACK_TSCONFIG
  // `randomUUID()` avoids the (vanishingly unlikely but real) PID-collision case
  // of two concurrent runs in the same cwd, and the more plausible case of a
  // prior run getting SIGKILL'd, leaving a stale `.tsconfig.lint-<pid>.json`
  // that a future same-PID run would clobber.
  const tempTsconfig = `${cwd}/.tsconfig.lint-${randomUUID()}.json`
  const typeRoots = hasTsconfig ? undefined : resolveBundledTypeRoots()
  const body: TempTsconfig = {
    extends: base,
    // `include`/`exclude` are NOT inherited via `extends` (TS docs), so we
    // always set include explicitly. When positionals are given they win;
    // otherwise broad globs (only reached when fallback is in use).
    include:
      positionals.length > 0
        ? positionals.map((p) => resolve(cwd, p))
        : ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    ...(typeRoots ? { compilerOptions: { typeRoots: [typeRoots] } } : {}),
  }
  try {
    await Bun.write(tempTsconfig, JSON.stringify(body))
  } catch (err) {
    throw new Error(`lint: failed to write temp tsconfig at ${tempTsconfig}`, { cause: err })
  }
  registerTempTsconfigCleanup(tempTsconfig)
  return shellJoin(['tsc', '--noEmit', '-p', tempTsconfig])
}

const runConcurrent = async (extra: string[], names: string[], cmds: string[]) => {
  const result = await $`concurrently --prefix-colors auto --names ${names.join(',')} ${extra} ${cmds}`.nothrow()
  process.exit(result.exitCode ?? 1)
}

if (format) {
  const cmds = [eslintCmd(['--fix']), prettierCmd('--write')]
  await runConcurrent(['--max-processes', '1'], ['eslint', 'prettier'], cmds)
} else {
  const cmds = [eslintCmd([]), prettierCmd('--check')]
  const names = ['eslint', 'prettier']
  if (shouldRunTsc) {
    cmds.push(await buildTscCmd())
    names.push('tsc')
  }
  await runConcurrent([], names, cmds)
}
