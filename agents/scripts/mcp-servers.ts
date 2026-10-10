// The MCP servers the language sets ship (mcpServers in copy-set.ts). lint:claude checks their
// definitions, and those inline in agents, with findServerProblems and findAgentServerProblems.
// install.ts merges the chosen sets' servers into a project's .mcp.json, and compares entries there
// with hashServer and identifyServer.

import { basename } from 'node:path'

import { LANGUAGE_SETS, SET_NAMES, type SetName } from './copy-set.ts'

// A command that downloads a package and runs it, such as bunx or pnpm dlx. The package is the value
// of one of packageOptions, or else the first argument that isn't an option; valueOptions are the
// runner's other options that take a value.
type PackageRunner = {
  command: string
  subcommand?: string
  ecosystem: string
  packageOptions: readonly string[]
  valueOptions: readonly string[]
  exactVersion: RegExp
}

// A value in a server definition and where it sits, for problem messages.
type Slot = { label: string; value: string }

// What claude mcp add accepts.
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

const STDIO_KEYS = new Set(['type', 'command', 'args', 'env'])
const HTTP_KEYS = new Set(['type', 'url', 'headers'])
const HTTPS_PROTOCOL = 'https:'
// Claude Code's ${VAR} and ${VAR:-default}; it leaves anything else that starts with ${ as it is.
const REFERENCE_PATTERN = /\$\{[A-Za-z_][A-Za-z0-9_]*(?::-([^}]*))?\}/g
const REFERENCE_START = '${'
// A reference with nothing literal in it: no default, or an empty one.
const BARE_REFERENCE_PATTERN = /^\$\{[A-Za-z_][A-Za-z0-9_]*(:-)?\}$/
const AUTH_SCHEME_PATTERN = /^(Basic|Bearer|Token) /i
// An auth scheme followed by anything but a reference, as in a header written into an argument or a
// JSON blob in env.
const LITERAL_CREDENTIALS_PATTERN = /\b(Basic|Bearer|Token)\s+(?!\$\{)\S/i
const NPM_EXACT_PATTERN = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*@\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/i
const PYPI_EXACT_PATTERN = /^[A-Za-z0-9][\w.-]*(\[[\w,.-]+\])?(==|@)\d[\w.+!-]*$/
const NPM_NAME_PATTERN = /^(@[^/@]+\/[^@]+|[^@]+)/
const PYPI_NAME_PATTERN = /^[A-Za-z0-9][\w.-]*/
const PYPI_SEPARATOR_PATTERN = /[-_.]+/g
const END_OF_OPTIONS = '--'
const NPM_RUNNER = {
  ecosystem: 'npm',
  packageOptions: ['-p', '--package'],
  valueOptions: ['--registry', '--cache', '--userconfig'],
  exactVersion: NPM_EXACT_PATTERN,
}
const PACKAGE_RUNNERS: readonly PackageRunner[] = [
  { command: 'bunx', ...NPM_RUNNER },
  { command: 'bun', subcommand: 'x', ...NPM_RUNNER },
  { command: 'npx', ...NPM_RUNNER },
  { command: 'npm', subcommand: 'exec', ...NPM_RUNNER },
  { command: 'pnpm', subcommand: 'dlx', ...NPM_RUNNER },
  { command: 'yarn', subcommand: 'dlx', ...NPM_RUNNER },
  {
    command: 'uvx',
    ecosystem: 'pypi',
    packageOptions: ['--from'],
    valueOptions: ['--python', '-p', '--with', '--index', '--index-url', '--extra-index-url'],
    exactVersion: PYPI_EXACT_PATTERN,
  },
]
const URL_PATTERN = /https?:\/\/[^\s"'}]+/g
const TRAILING_SLASHES_PATTERN = /\/+$/
// Names that end in a secret's name, such as API_TOKEN, --api-key, X-Api-Key and Authorization, but not
// --token-file or --auth-type.
const SECRET_NAME_PATTERN =
  /(^|[-_])(auth|authorization|token|secret|password|passwd|credentials?|cookie|key|(api|access|private)[-_]?key)$/i
const CAMEL_CASE_PATTERN = /([a-z\d])([A-Z])/g
// Secrets recognizable by their shape: AWS access keys, GitHub, OpenAI-style and Slack tokens, JWTs,
// and credentials in a URL.
const SECRET_SHAPE_PATTERN =
  /\b(AKIA|ASIA)[0-9A-Z]{16}\b|\bgh[pousr]_\w{36,}|\bsk-[\w-]{20,}|\bxox[abprs]-[\w-]{10,}|\beyJ[\w-]{10,}\.eyJ|\/\/[^/@\s]+:[^/@\s]+@/
const ASSIGNMENT_PATTERN = /^-{0,2}([\w-]+)=(.*)$/
// A header written as one argument, such as mcp-remote's --header "Authorization: Bearer …".
const HEADER_ARGUMENT_PATTERN = /^([A-Za-z][\w-]*):(?!\/\/)\s*(.*)$/
const QUERY_PARAMETER_PATTERN = /[?&]([^=&#]+)=([^&#]*)/g

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isText = (value: unknown) => typeof value === 'string' && value.trim() !== ''

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((item) => typeof item === 'string')

const problemIf = (condition: boolean, problem: string) => (condition ? [problem] : [])

// Every server the given sets ship, by name.
export const listServers = (sets: readonly SetName[]) =>
  new Map(sets.flatMap((set) => Object.entries(LANGUAGE_SETS[set].mcpServers)))

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

const findRunner = (server: Record<string, unknown>) => {
  if (typeof server.command !== 'string') return undefined
  const command = basename(server.command)
  const [first] = listArgs(server)
  return PACKAGE_RUNNERS.find(
    (runner) => runner.command === command && (runner.subcommand === undefined || runner.subcommand === first)
  )
}

// The arguments the runner itself reads, after a subcommand such as dlx.
const listRunnerArgs = (server: Record<string, unknown>, runner: PackageRunner) =>
  runner.subcommand === undefined ? listArgs(server) : listArgs(server).slice(1)

const findOption = (arg: string, options: readonly string[]) =>
  options.find((option) => arg === option || arg.startsWith(`${option}=`))

// The runner's own options come before the package, and everything after it belongs to the server.
const findPackageSpec = (args: readonly string[], runner: PackageRunner): string | undefined => {
  const [arg, next, ...rest] = args
  if (arg === undefined) return undefined
  if (arg === END_OF_OPTIONS) return next
  if (!arg.startsWith('-')) return arg
  const option = findOption(arg, [...runner.packageOptions, ...runner.valueOptions])
  if (option === undefined) return findPackageSpec(args.slice(1), runner)
  const isSeparateValue = arg === option
  if (runner.packageOptions.includes(option)) return isSeparateValue ? next : arg.slice(option.length + 1)
  return findPackageSpec(isSeparateValue ? rest : args.slice(1), runner)
}

const readPackageName = (spec: string, runner: PackageRunner) => {
  if (runner.ecosystem === NPM_RUNNER.ecosystem) return spec.match(NPM_NAME_PATTERN)?.[0]
  return spec.match(PYPI_NAME_PATTERN)?.[0].toLowerCase().replace(PYPI_SEPARATOR_PATTERN, '-')
}

const identifyPackage = (server: Record<string, unknown>) => {
  const runner = findRunner(server)
  const spec = runner && findPackageSpec(listRunnerArgs(server, runner), runner)
  const name = runner && spec && readPackageName(spec, runner)
  return runner && name ? [`${runner.ecosystem} package ${name}`] : []
}

const normalizeUrl = (url: string) => {
  try {
    const { host, pathname } = new URL(url)
    return `${host}${pathname.replace(TRAILING_SLASHES_PATTERN, '')}`
  } catch {
    return url
  }
}

// Arguments that are neither options nor, as far as one can tell without knowing the command, an
// option's value, so a --browserUrl or --registry doesn't count as the server's own URL.
const listPositionals = (args: readonly string[]) =>
  args.filter((arg, index) => {
    const previous = args[index - 1]
    const isOptionValue = previous?.startsWith('-') === true && !previous.includes('=')
    return !(arg.startsWith('-') || isOptionValue)
  })

// What a server connects to, to spot one server under two names: its URL, or the URL a proxy such as
// mcp-remote forwards to, or else the package a runner such as bunx starts, whatever the version.
export const identifyServer = (server: unknown) => {
  if (!isRecord(server)) return new Set<string>()
  const urls = [
    ...(typeof server.url === 'string' ? [server.url] : []),
    ...listPositionals(listArgs(server)).flatMap((arg) => arg.match(URL_PATTERN) ?? []),
  ]
  return new Set(urls.length > 0 ? urls.map((url) => `URL ${normalizeUrl(url)}`) : identifyPackage(server))
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

// A server a runner downloads must name an exact version; other commands run what's installed.
const findVersionProblems = (server: Record<string, unknown>) => {
  const runner = findRunner(server)
  if (runner === undefined) return []
  const spec = findPackageSpec(listRunnerArgs(server, runner), runner)
  if (spec === undefined) return [`${String(server.command)} has no package to run`]
  return problemIf(!runner.exactVersion.test(spec), `${spec} isn't pinned to an exact version`)
}

const listEntries = (record: unknown, prefix = ''): Slot[] =>
  isStringRecord(record) ? Object.entries(record).map(([key, value]) => ({ label: `${prefix}${key}`, value })) : []

const listSlots = (server: Record<string, unknown>): Slot[] => [
  ...(typeof server.command === 'string' ? [{ label: 'command', value: server.command }] : []),
  ...listArgs(server).map((value, index) => ({ label: `args[${index}]`, value })),
  ...(typeof server.url === 'string' ? [{ label: 'url', value: server.url }] : []),
  ...listEntries(server.env, 'env.'),
  ...listEntries(server.headers, 'headers.'),
]

// camelCase counts too: apiToken reads as api_Token.
const isSecretName = (label: string) => SECRET_NAME_PATTERN.test(label.replace(CAMEL_CASE_PATTERN, '$1_$2'))

// A secret has to come from the environment whole: a default after :- would be a literal secret too.
const isBareReference = (value: string) => BARE_REFERENCE_PATTERN.test(value.replace(AUTH_SCHEME_PATTERN, ''))

// The value as it expands with nothing set, so a literal default still gets scanned.
const expandDefaults = (value: string) =>
  value.replace(REFERENCE_PATTERN, (_reference, fallback: string | undefined) => fallback ?? '')

// KEY=value, --option=value and "Name: value" arguments, and an option with the argument after it.
const listArgumentValues = (args: readonly string[]) =>
  args.flatMap((arg, index): Slot[] => {
    const [, label, value] = arg.match(ASSIGNMENT_PATTERN) ?? arg.match(HEADER_ARGUMENT_PATTERN) ?? []
    if (label !== undefined && value !== undefined) return [{ label, value }]
    const next = args[index + 1]
    return arg.startsWith('-') && next !== undefined && !next.startsWith('-') ? [{ label: arg, value: next }] : []
  })

// Values that sit under a name: env and headers entries, arguments, and URL query parameters.
const listNamedValues = (server: Record<string, unknown>, slots: readonly Slot[]): Slot[] => [
  ...listEntries(server.env),
  ...listEntries(server.headers),
  ...listArgumentValues(listArgs(server)),
  ...slots.flatMap(({ value }) =>
    [...value.matchAll(QUERY_PARAMETER_PATTERN)].map(([, label = '', parameter = '']) => ({ label, value: parameter }))
  ),
]

const findSecretProblems = (server: Record<string, unknown>) => {
  const slots = listSlots(server)
  return [
    ...slots
      .filter(
        ({ value }) => SECRET_SHAPE_PATTERN.test(expandDefaults(value)) || LITERAL_CREDENTIALS_PATTERN.test(value)
      )
      .map(({ label }) => `${label} looks like it holds a literal secret; reference it as \${VAR} instead`),
    ...listNamedValues(server, slots)
      .filter(({ label, value }) => isSecretName(label) && !isBareReference(value))
      .map(({ label }) => `${label} is a secret, so its value must be a \${VAR} reference without a default`),
  ]
}

const findReferenceProblems = (server: Record<string, unknown>) =>
  listSlots(server)
    .filter(({ value }) => value.replace(REFERENCE_PATTERN, '').includes(REFERENCE_START))
    .map(({ label }) => `${label} has a \${…} that isn't \${VAR} or \${VAR:-default}, so it wouldn't expand`)

const findDefinitionProblems = (name: string, server: unknown) => {
  if (!isRecord(server)) return ['must be an object']
  return [
    ...problemIf(!SERVER_NAME_PATTERN.test(name), 'the name may only hold letters, digits, hyphens and underscores'),
    ...findShapeProblems(server),
    ...findVersionProblems(server),
    ...findReferenceProblems(server),
    ...findSecretProblems(server),
  ]
}

// Every server is in exactly one set and has a valid, pinned definition without literal secrets.
export const findServerProblems = () => {
  const entries = SET_NAMES.flatMap((set) =>
    Object.entries(LANGUAGE_SETS[set].mcpServers).map(([name, server]) => ({ set, name, server }))
  )
  const names = [...new Set(entries.map(({ name }) => name))]
  return [
    ...names.flatMap((name) => {
      const owners = entries.filter((entry) => entry.name === name).map(({ set }) => set)
      return problemIf(owners.length > 1, `MCP server ${name}: in more than one language set (${owners.join(', ')})`)
    }),
    ...entries.flatMap(({ set, name, server }) =>
      findDefinitionProblems(name, server).map((problem) => `MCP server ${name} (${set} set): ${problem}`)
    ),
  ]
}

// An agent's mcpServers lists configured servers by name and inline definitions keyed by name; only
// the inline ones carry a definition to check.
export const findAgentServerProblems = (mcpServers: unknown) => {
  if (mcpServers === undefined) return []
  if (!Array.isArray(mcpServers)) return ['mcpServers must be a list']
  return mcpServers.flatMap((entry: unknown) => {
    if (typeof entry === 'string') return []
    if (!isRecord(entry)) return ['each mcpServers entry must be a server name or an inline definition']
    return Object.entries(entry).flatMap(([name, server]) =>
      findDefinitionProblems(name, server).map((problem) => `MCP server ${name}: ${problem}`)
    )
  })
}
