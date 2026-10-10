// The MCP servers the language sets ship: their definitions are this repo's .mcp.json, and copy-set.ts
// names each one's set. lint:claude and install.ts read them with loadServers, which also checks them;
// install.ts merges the chosen sets' servers into a project's .mcp.json and compares entries there with
// hashServer and identifyServer.

import { basename } from 'node:path'

import { LANGUAGE_SETS, MCP_JSON_FILE, readIfExists, SERVERS_FILE, SET_NAMES } from './copy-set.ts'
import { parseMcpJson } from './mcp-json.ts'

// .mcp.json entries as lint:claude accepts them. Claude Code expands ${VAR} and ${VAR:-default} in them
// when it starts the server.
export type StdioServer = {
  type: 'stdio'
  command: string
  args: readonly string[]
  env?: Readonly<Record<string, string>>
}

export type HttpServer = { type: 'http'; url: string; headers?: Readonly<Record<string, string>> }

export type McpServer = StdioServer | HttpServer

// A command that downloads a package and runs it, such as bunx: name finds the package's name in what
// it runs, and exactVersion matches what is pinned to one version.
type PackageRunner = { ecosystem: string; name: RegExp; exactVersion: RegExp }

// What claude mcp add accepts.
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

const STDIO_KEYS = new Set(['type', 'command', 'args', 'env'])
const HTTP_KEYS = new Set(['type', 'url', 'headers'])
const HTTPS_PROTOCOL = 'https:'
// Problems with skillster's own file also reach the installer, which reads the project's .mcp.json too.
const SERVERS_LABEL = `skillster's ${MCP_JSON_FILE}`
// A value that comes from the environment whole.
const REFERENCE_PATTERN = /^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/
const NPM_NAME_PATTERN = /^(@[^/@]+\/[^@]+|[^@]+)/
const NPM_EXACT_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/i
const PYPI_NAME_PATTERN = /^[A-Za-z0-9][\w.-]*/
const PYPI_EXACT_PATTERN = /^[A-Za-z0-9][\w.-]*(\[[\w,.-]+\])?(==|@)\d[\w.+!-]*$/
const NPM_RUNNER: PackageRunner = { ecosystem: 'npm', name: NPM_NAME_PATTERN, exactVersion: NPM_EXACT_PATTERN }
// The sets run npm packages with bunx; npx is here to spot the npx servers projects already have.
const PACKAGE_RUNNERS = new Map<string, PackageRunner>([
  ['bunx', NPM_RUNNER],
  ['npx', NPM_RUNNER],
  ['uvx', { ecosystem: 'pypi', name: PYPI_NAME_PATTERN, exactVersion: PYPI_EXACT_PATTERN }],
])
const TRAILING_SLASHES_PATTERN = /\/+$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown) => typeof value === 'string' && value.trim() !== ''

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string')

const problemIf = (condition: boolean, problem: string) => (condition ? [problem] : [])

// This repo's .mcp.json: its servers, or what keeps them from being read.
const readDefinitions = async () => {
  const text = await readIfExists(() => Bun.file(SERVERS_FILE).text())
  return text === undefined ? { problem: 'is missing' } : parseMcpJson(text)
}

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .toSorted()
      .map((key) => [key, sortKeys(value[key])])
  )
}

// Hashes the parsed entry rather than its bytes, so reformatting .mcp.json or reordering an entry's
// keys doesn't count as an edit.
export const hashServer = (server: unknown) =>
  new Bun.CryptoHasher('sha256').update(JSON.stringify(sortKeys(server))).digest('hex')

const listArgs = (server: Record<string, unknown>) => (isStringList(server.args) ? server.args : [])

const findRunner = (server: Record<string, unknown>) =>
  typeof server.command === 'string' ? PACKAGE_RUNNERS.get(basename(server.command)) : undefined

// The runner's own options come before the package, as in npx -y pkg@1.0.0.
const findPackageSpec = (server: Record<string, unknown>) => listArgs(server).find((arg) => !arg.startsWith('-'))

const normalizeUrl = (url: string) => {
  const parsed = URL.parse(url)
  return parsed === null ? url : `${parsed.host}${parsed.pathname.replace(TRAILING_SLASHES_PATTERN, '')}`
}

// What a server connects to, to spot one server under two names: its URL, or else the package a
// runner such as bunx starts, whatever the version.
export const identifyServer = (server: unknown) => {
  if (!isRecord(server)) return undefined
  if (typeof server.url === 'string') return `URL ${normalizeUrl(server.url)}`
  const runner = findRunner(server)
  const name = runner && findPackageSpec(server)?.match(runner.name)?.[0]
  return runner && name ? `${runner.ecosystem} package ${name}` : undefined
}

const listUnknownKeys = (server: Record<string, unknown>, keys: ReadonlySet<string>) =>
  Object.keys(server)
    .filter((key) => !keys.has(key))
    .map((key) => `unknown field "${key}"`)

const isHttpsUrl = (value: unknown) => typeof value === 'string' && URL.parse(value)?.protocol === HTTPS_PROTOCOL

const findShapeProblems = (server: Record<string, unknown>) => {
  if (server.type === 'stdio') {
    return [
      ...problemIf(!isText(server.command), 'a stdio server needs a command'),
      ...problemIf(!isStringList(server.args), 'a stdio server needs args, a list of strings'),
      ...problemIf(server.env !== undefined && !isStringRecord(server.env), 'env must map names to strings'),
      ...listUnknownKeys(server, STDIO_KEYS),
    ]
  }
  if (server.type === 'http') {
    return [
      ...problemIf(!isHttpsUrl(server.url), 'an http server needs an https URL'),
      ...problemIf(
        server.headers !== undefined && !isStringRecord(server.headers),
        'headers must map names to strings'
      ),
      ...listUnknownKeys(server, HTTP_KEYS),
    ]
  }
  return ['type must be "stdio" or "http"']
}

// A package a runner downloads names an exact version, or the runner would start whatever was
// published last. Other commands run what's installed.
const findVersionProblems = (server: Record<string, unknown>) => {
  const runner = findRunner(server)
  if (runner === undefined) return []
  const spec = findPackageSpec(server)
  if (spec === undefined) return [`${String(server.command)} has no package to run`]
  return problemIf(!runner.exactVersion.test(spec), `${spec} isn't pinned to an exact version`)
}

const listValues = (record: unknown, field: string) =>
  isStringRecord(record) ? Object.entries(record).map(([key, value]) => ({ label: `${field}.${key}`, value })) : []

// Secrets go in env and headers, so the values there come from the environment whole.
const findSecretProblems = (server: Record<string, unknown>) =>
  [...listValues(server.env, 'env'), ...listValues(server.headers, 'headers')]
    .filter(({ value }) => !REFERENCE_PATTERN.test(value))
    .map(({ label }) => `${label} must be a \${VAR} reference, so no secret is written into the file`)

const findDefinitionProblems = (name: string, server: unknown) => {
  if (!isRecord(server)) return ['must be an object']
  return [
    ...problemIf(!SERVER_NAME_PATTERN.test(name), 'the name may only hold letters, digits, hyphens and underscores'),
    ...findShapeProblems(server),
    ...findVersionProblems(server),
    ...findSecretProblems(server),
  ]
}

const findOwnershipProblems = (name: string) => {
  const owners = SET_NAMES.filter((set) => LANGUAGE_SETS[set].mcpServers.includes(name))
  if (owners.length === 0) return ['in no language set; add it to one in scripts/copy-set.ts']
  return problemIf(owners.length > 1, `in more than one language set (${owners.join(', ')})`)
}

const findMissingServers = (servers: Record<string, unknown>) =>
  SET_NAMES.flatMap((set) =>
    LANGUAGE_SETS[set].mcpServers
      .filter((name) => !Object.hasOwn(servers, name))
      .map((name) => `MCP server ${name}: listed in the ${set} set but missing from ${SERVERS_LABEL}`)
  )

// Every server is in exactly one set and has a valid, pinned definition with only ${VAR} references in
// env and headers, and every server a set lists is there.
const findServerProblems = (servers: Record<string, unknown>) => [
  ...Object.entries(servers).flatMap(([name, server]) =>
    [...findOwnershipProblems(name), ...findDefinitionProblems(name, server)].map(
      (problem) => `MCP server ${name}: ${problem}`
    )
  ),
  ...findMissingServers(servers),
]

const isMcpServer = (server: unknown): server is McpServer => isRecord(server) && findShapeProblems(server).length === 0

// This repo's .mcp.json, read once: what's wrong with it, and its servers by name. While anything is
// wrong there are no servers, so a broken file ships nothing.
export const loadServers = async () => {
  const { servers = {}, problem } = await readDefinitions()
  const problems = problem === undefined ? findServerProblems(servers) : [`${SERVERS_LABEL} ${problem}`]
  const valid =
    problems.length > 0
      ? []
      : Object.entries(servers).flatMap(([name, server]) => (isMcpServer(server) ? [[name, server] as const] : []))
  return { problems, servers: new Map(valid) }
}
