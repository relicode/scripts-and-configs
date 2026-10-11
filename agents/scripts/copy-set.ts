// The copy set (.claude/rules, skills and agents) split into language sets, and the MCP servers from
// this repo's .mcp.json that each set adds to a project's. install.ts installs by set; lint:claude
// checks that every copy-set file is in exactly one set and that every listed entry exists, so a new
// rule, skill or agent can't ship by accident or go missing, and mcp-servers.ts does the same for the
// servers.

import { lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { $ } from 'bun'

export type SetName = (typeof SET_NAMES)[number]

type Frontmatter = Record<string, unknown>

// Rules are paths under rules/, skills are folder names under skills/, agents are file names
// under agents/ without .md, and MCP servers are names in this repo's .mcp.json.
type LanguageSet = {
  rules: readonly string[]
  skills: readonly string[]
  agents: readonly string[]
  mcpServers: readonly string[]
  requires: readonly SetName[]
}

export const SET_NAMES = ['core', 'js', 'web', 'react', 'next', 'mui', 'astro', 'mobile', 'aws'] as const
export const CLAUDE_DIR_NAME = '.claude'
export const MCP_JSON_FILE = '.mcp.json'
export const RULES_FOLDER = 'rules'
export const SKILLS_FOLDER = 'skills'
export const AGENTS_FOLDER = 'agents'
export const COMMANDS_FOLDER = 'commands'
export const SKILL_FILE = 'SKILL.md'
export const COPY_SET_FOLDERS = [RULES_FOLDER, SKILLS_FOLDER, AGENTS_FOLDER] as const
export const COPY_SET_DIR = join(import.meta.dir, '..', CLAUDE_DIR_NAME)
// The sets' MCP servers, which this repo's own sessions read as well.
export const SERVERS_FILE = join(import.meta.dir, '..', MCP_JSON_FILE)

const CORE_SET: SetName = 'core'
const MAX_NAME_LENGTH = 255
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u
const OPENING_FENCE_PATTERN = /^---[ \t]*\r?\n/
const FRONTMATTER_PATTERN = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---/
// Claude Code's own frontmatter rules: a looser fence, and a retry that quotes values with these
// characters and turns leading tabs into spaces when strict YAML fails.
const CLAUDE_CODE_FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)---\s*\n?/
const NEEDS_QUOTES_PATTERN = /[{}[\]*&#!|>%@`]|: /
const KEY_VALUE_PATTERN = /^([\w-]+):[ \t]*(.*?)\r?$/
const LEADING_TABS_PATTERN = /^\t+/
const TAB_INDENT = '  '

export const LANGUAGE_SETS: Record<SetName, LanguageSet> = {
  core: {
    rules: ['clean-code.md', 'scripts.md'],
    skills: ['review-generic', 'develop-generic'],
    agents: ['reviewer'],
    mcpServers: ['context7'],
    requires: [],
  },
  js: {
    rules: ['js/typescript.md', 'js/lint-and-format.md', 'js/bun.md'],
    skills: ['review-bun', 'best-practices-bun'],
    agents: ['dev-bun', 'reviewer-bun'],
    mcpServers: [],
    requires: [],
  },
  // Web apps are written in JS/TS, which the js rules cover.
  web: {
    rules: [],
    skills: [],
    agents: [],
    mcpServers: ['chrome-devtools'],
    requires: ['js'],
  },
  // React code runs in the browser, so React brings web, and with it the JS/TS set that reviewer-react's
  // preloaded review-bun and best-practices-bun come from.
  react: {
    rules: ['js/react.md'],
    skills: ['review-react', 'best-practices-react'],
    agents: ['reviewer-react'],
    mcpServers: [],
    requires: ['web'],
  },
  // dev-next and reviewer-next preload the React skills, so Next.js never ships without React.
  next: {
    rules: [],
    skills: [],
    agents: ['dev-next', 'reviewer-next'],
    mcpServers: ['next-devtools'],
    requires: ['react'],
  },
  // MUI is a React component library.
  mui: {
    rules: [],
    skills: [],
    agents: [],
    mcpServers: ['mui-mcp'],
    requires: ['react'],
  },
  // reviewer-astro preloads the React skills for React islands, so Astro brings React, and with it web and
  // the JS/TS set, whose rules cover .astro files.
  astro: {
    rules: [],
    skills: [],
    agents: ['dev-astro', 'reviewer-astro'],
    mcpServers: ['astro-docs'],
    requires: ['react'],
  },
  // Expo and React Native apps, whose JS/TS the js rules cover. maestro is the Maestro CLI's own
  // server, so its version is whatever the developer installed.
  mobile: {
    rules: [],
    skills: [],
    agents: [],
    mcpServers: ['maestro'],
    requires: ['js'],
  },
  // aws-mcp runs AWS's own SigV4 proxy, from the distribution that pins its whole dependency tree. It
  // signs with the developer's AWS profile, so --read-only keeps the tools that need write access out of
  // reach.
  aws: {
    rules: [],
    skills: [],
    agents: [],
    mcpServers: ['aws-mcp'],
    requires: [],
  },
}

export const isMissingPathError = (error: unknown) =>
  error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')

export const readIfExists = async <T>(read: () => Promise<T>) => {
  try {
    return await read()
  } catch (error) {
    if (isMissingPathError(error)) return undefined
    throw error
  }
}

// A skill entry ends in / because it covers every file in the skill's folder.
const listEntries = ({ rules, skills, agents }: LanguageSet) => [
  ...rules.map((rule) => `${RULES_FOLDER}/${rule}`),
  ...skills.map((skill) => `${SKILLS_FOLDER}/${skill}/`),
  ...agents.map((agent) => `${AGENTS_FOLDER}/${agent}.md`),
]

const isInEntry = (file: string, entry: string) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry)

// The file an entry can't ship without: a skill folder without its SKILL.md isn't a skill.
const findRequiredFile = (entry: string) => (entry.endsWith('/') ? `${entry}${SKILL_FILE}` : entry)

const addRequiredSets = (names: readonly SetName[]): readonly SetName[] => {
  const missing = names.flatMap((name) => LANGUAGE_SETS[name].requires).filter((name) => !names.includes(name))
  return missing.length === 0 ? names : addRequiredSets([...names, ...missing])
}

export const isSetName = (name: string): name is SetName => SET_NAMES.some((setName) => setName === name)

export const findOwnerSets = (file: string) =>
  SET_NAMES.filter((name) => listEntries(LANGUAGE_SETS[name]).some((entry) => isInEntry(file, entry)))

// A path the installer's manifest accepts, so a shipped file can't break the next re-install.
export const isPortablePath = (file: string) =>
  !CONTROL_CHARACTER_PATTERN.test(file) && file.split('/').every((part) => part.length <= MAX_NAME_LENGTH)

const findPathProblems = (file: string) =>
  isPortablePath(file)
    ? []
    : [`${CLAUDE_DIR_NAME}/${JSON.stringify(file)}: rename it; control characters and over-long names can't ship`]

const findOwnershipProblems = (file: string) => {
  const owners = findOwnerSets(file)
  const path = `${CLAUDE_DIR_NAME}/${file}`
  if (owners.length === 0) return [`${path}: in no language set; add it to one in scripts/copy-set.ts`]
  return owners.length > 1 ? [`${path}: in more than one language set (${owners.join(', ')})`] : []
}

const findMissingEntries = (files: readonly string[]) =>
  SET_NAMES.flatMap((name) =>
    listEntries(LANGUAGE_SETS[name])
      .map(findRequiredFile)
      .filter((file) => !files.includes(file))
      .map((file) => `${CLAUDE_DIR_NAME}/${file}: listed in the ${name} set but missing`)
  )

// A symlink would ship whatever it points to, and a submodule nothing at all.
const findIrregularFiles = async (files: readonly string[]) => {
  const stats = await Promise.all(files.map((file) => lstat(join(COPY_SET_DIR, file))))
  return files
    .filter((_, index) => !stats[index]?.isFile())
    .map((file) => `${CLAUDE_DIR_NAME}/${file}: not a regular file; the copy set holds real files only`)
}

// Core always ships, and every chosen set brings the sets it requires.
export const resolveSets = (chosen: readonly SetName[]) => {
  const resolved = addRequiredSets([CORE_SET, ...chosen])
  return SET_NAMES.filter((name) => resolved.includes(name))
}

// The files git would commit, relative to .claude/: gitignored editor and OS clutter never ships,
// and anything else that isn't in a set fails lint instead of shipping unnoticed. Files deleted
// from the working tree drop out; the installer warns about them as uncommitted changes.
export const listCopySetFiles = async () => {
  const listing =
    await $`git -C ${COPY_SET_DIR} ls-files -z --cached --others --exclude-standard -- ${COPY_SET_FOLDERS}`
      .quiet()
      .text()
  const files = [...new Set(listing.split('\0').filter((file) => file !== ''))]
  const present = await Promise.all(
    files.map(async (file) => ((await readIfExists(() => lstat(join(COPY_SET_DIR, file)))) ? [file] : []))
  )
  return present.flat().toSorted()
}

// This module and .mcp.json decide what each set ships, so their own uncommitted changes count too.
export const hasUncommittedChanges = async () => {
  const paths = [...COPY_SET_FOLDERS.map((folder) => join(COPY_SET_DIR, folder)), import.meta.path, SERVERS_FILE]
  const status =
    await $`git -C ${COPY_SET_DIR} --no-optional-locks status --porcelain --untracked-files=all -- ${paths}`
      .quiet()
      .text()
  return status.trim() !== ''
}

export const findSetProblems = async (files: readonly string[]) => [
  ...files.flatMap(findPathProblems),
  ...(await findIrregularFiles(files)),
  ...files.flatMap(findOwnershipProblems),
  ...findMissingEntries(files),
]

export const hasFrontmatterFence = (text: string) => OPENING_FENCE_PATTERN.test(text)

const parseYaml = (text: string): Frontmatter | undefined => {
  try {
    const parsed: unknown = Bun.YAML.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Frontmatter) : undefined
  } catch {
    return undefined
  }
}

// Strict, for the copy set's own files.
export const readFrontmatter = async (path: string) => {
  const text = (await Bun.file(path).text()).match(FRONTMATTER_PATTERN)?.[1]
  return text === undefined ? undefined : parseYaml(text)
}

const quoteLine = (line: string) => {
  const spaced = line.replace(LEADING_TABS_PATTERN, (tabs) => TAB_INDENT.repeat(tabs.length))
  const [, key, value = ''] = spaced.match(KEY_VALUE_PATTERN) ?? []
  return key !== undefined && NEEDS_QUOTES_PATTERN.test(value) ? `${key}: ${JSON.stringify(value)}` : spaced
}

// As Claude Code reads a project's agents and skills, so the installer sees the names it loads.
export const readClaudeCodeFrontmatter = async (path: string) => {
  const text = (await Bun.file(path).text()).match(CLAUDE_CODE_FRONTMATTER_PATTERN)?.[1]
  if (text === undefined) return undefined
  return parseYaml(text) ?? parseYaml(text.split('\n').map(quoteLine).join('\n'))
}
