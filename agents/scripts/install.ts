// Installs language sets from this repo's copy set into another repository's .claude/:
//   bun scripts/install.ts <target> [--dry-run] [--sets core,js,react,next,astro] [--force]
// Nothing is written until every check passes. The manifest records what was installed, so a
// re-install can tell its own files from the project's and notice local edits.

import { access, appendFile, constants, lstat, mkdir, open, readdir, realpath, rmdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, posix, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { $ } from 'bun'

import {
  AGENTS_FOLDER,
  CLAUDE_DIR_NAME,
  COMMANDS_FOLDER,
  COPY_SET_DIR,
  COPY_SET_FOLDERS,
  findOwnerSets,
  findSetProblems,
  hasUncommittedChanges,
  isPortablePath,
  isSetName,
  LANGUAGE_SETS,
  listCopySetFiles,
  readClaudeCodeFrontmatter,
  readIfExists,
  resolveSets,
  SET_NAMES,
  type SetName,
  SKILL_FILE,
  SKILLS_FOLDER,
} from './copy-set.ts'

type Options = { target: string; sets?: SetName[]; isDryRun: boolean; isForced: boolean }

type Manifest = { commit: string; sets: string[]; files: Record<string, string> }

// mode is what the file is created with; the umask still applies.
type ShippedFile = { hash: string; mode: number; bytes: Uint8Array }

type FileState = { kind: 'missing' } | { kind: 'file'; hash: string } | { kind: 'other' }

// A path under .claude/ that the install touches: shipped now, installed before, or both.
type FileCheck = { file: string; shipped?: ShippedFile; installedHash?: string; state: FileState }

type Action = 'create' | 'update' | 'adopt' | 'keep' | 'delete'

type GitResult = { isOk: boolean; output: string; error: string }

// What to append to .prettierignore, or why it can't be appended to.
type PrettierIgnorePlan = { append?: string; problem?: string }

type Plan = {
  target: string
  claudeDir: string
  sets: SetName[]
  commit: string
  previous?: Manifest
  packageJson: unknown
  checks: FileCheck[]
  prettierIgnore: PrettierIgnorePlan
}

type Preparation = { plan?: Plan; problems: string[]; warnings: string[]; notes: string[] }

const USAGE = `Usage: bun scripts/install.ts <target> [--dry-run] [--sets ${SET_NAMES.join(',')}] [--force]`
const EXIT_OK = 0
const EXIT_FAILED = 1
const SOURCE_ROOT = join(import.meta.dir, '..')
const MANIFEST_FILE = 'skillster-manifest.json'
const AGENT_FILES = `${AGENTS_FOLDER}/**/*.md`
const SKILL_FILES = `*/${SKILL_FILE}`
const COMMAND_FILES = '*.md'
const MARKDOWN_EXTENSION = '.md'
const USER_CLAUDE_DIR = join(homedir(), CLAUDE_DIR_NAME)
const USER_CLAUDE_LABEL = `~/${CLAUDE_DIR_NAME}`
const PERSONAL_SKILLS_DIR = join(USER_CLAUDE_DIR, SKILLS_FOLDER)
const PERSONAL_SKILLS_LABEL = `${USER_CLAUDE_LABEL}/${SKILLS_FOLDER}`
const HASH_PATTERN = /^[0-9a-f]{64}$/
const COPY_SET_PATH_PATTERN = new RegExp(`^(${COPY_SET_FOLDERS.join('|')})/`)
const FILE_MODE = 0o666
const EXECUTABLE_FILE_MODE = 0o777
const EXECUTE_BITS = 0o111
const NUL = 0x00
const CARRIAGE_RETURN = 0x0d
const LINE_FEED = 0x0a
const TRAILING_NEWLINE_PATTERN = /\n$/
const IGNORABLE_PATTERN = /[\p{Cf}\p{Default_Ignorable_Code_Point}\s]/gu
const DASH_PATTERN = /\p{Dash}/gu
const IGNORE_PREFIX_PATTERN = /^(\*\*)?\//
const IGNORE_SUFFIX_PATTERN = /\/(\*\*?)?$/
const IGNORE_NEGATION_PATTERN = /^!/
const BIOME_NEGATION_PATTERN = /^!!?/
const BIOME_PREFIX_PATTERN = /^\*\*\//
const BIOME_SUFFIX_PATTERN = /\/\*\*$/
const BIOME_EVERYTHING = '**'
const PRETTIER_PACKAGE = 'prettier'
const PRETTIER_FILE_PATTERN = /^(\.prettierrc(\..+)?|prettier\.config\..+|\.prettierignore)$/
const PRETTIER_IGNORE_FILE = '.prettierignore'
const PRETTIER_PATH_PATTERN = /\/(\.bin\/prettier|prettier\/bin\/prettier\.c?js)$/
const IGNORE_PATH_OPTION = '--ignore-path'
const QUOTED_PATTERN = /"[^"]*"|'[^']*'/g
const QUOTE_PATTERN = /["']/g
const COMMAND_SEPARATOR_PATTERN = /[;&|()]+/g
const WORD_SEPARATOR_PATTERN = /\s+/
const ENV_ASSIGNMENT_PATTERN = /^\w+=/
// Words that run the command after them, as in npx prettier or pnpm exec prettier.
const RUNNER_WORDS = new Set([
  'bun',
  'bunx',
  'cross-env',
  'dlx',
  'dotenv',
  'env',
  'exec',
  'node',
  'npm',
  'npx',
  'pnpm',
  'run',
  'time',
  'x',
  'yarn',
])
// In the order Biome looks for them.
const BIOME_CONFIG_FILES = ['biome.json', 'biome.jsonc', '.biome.json', '.biome.jsonc']
const PACKAGE_FILE = 'package.json'
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const
// A dependency that shows the project needs the set, so an install that leaves the set out can say so.
const SET_MARKER_PACKAGES: Partial<Record<SetName, string>> = { react: 'react-dom', next: 'next', astro: 'astro' }
const SET_PROBLEMS_HINT = 'Fix the language sets in skillster first; bun run lint reports the same problems.'
const SHORT_COMMIT_LENGTH = 7
const ACTION_WIDTH = 8

const claudePath = (file: string) => `${CLAUDE_DIR_NAME}/${file}`

const formatStep = (action: string, path: string) => `  ${action.padEnd(ACTION_WIDTH)}${path}`

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error))

// The manifest may not have made it, so the hint names the sets instead of relying on it.
const describeInterruptedHint = (sets: readonly SetName[]) =>
  `Fix the cause and re-run from the same skillster commit with --sets ${sets.join(',')}: files that landed ` +
  'whole are recognized by their content. If the re-run refuses a file this run cut off, delete that file first.'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasKey = (value: unknown, key: string) => isRecord(value) && key in value

const isText = (value: unknown) => typeof value === 'string' && value.trim() !== ''

// Text ignores CRLF versus LF, so a checkout with core.autocrlf doesn't look locally edited.
const hashContent = (bytes: Uint8Array) => {
  const content = bytes.includes(NUL)
    ? bytes
    : bytes.filter((byte, index) => byte !== CARRIAGE_RETURN || bytes[index + 1] !== LINE_FEED)
  return new Bun.CryptoHasher('sha256').update(content).digest('hex')
}

// Claude Code compares names ignoring case, spacing and invisible characters, and reads dash
// variants as hyphens; agent and command names get the same treatment.
const normalizeName = (name: string) =>
  name.normalize('NFKC').toLowerCase().replace(IGNORABLE_PATTERN, '').replace(DASH_PATTERN, '-')

const isDirectory = async (path: string) => (await readIfExists(() => stat(path)))?.isDirectory() === true

const canWrite = async (path: string) => {
  try {
    await access(path, constants.W_OK)
    return true
  } catch {
    return false
  }
}

const parseJsonc = (text: string): unknown => {
  try {
    return Bun.JSONC.parse(text)
  } catch {
    return undefined
  }
}

// Agent and skill folders may be symlinks, which Claude Code follows, so the scan follows them too.
const scanFiles = async (dir: string, pattern: string) => {
  if (!(await isDirectory(dir))) return []
  return (await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: dir, followSymlinks: true }))).toSorted()
}

const inspectFile = async (path: string): Promise<FileState> => {
  const stats = await readIfExists(() => lstat(path))
  if (stats === undefined) return { kind: 'missing' }
  if (!stats.isFile()) return { kind: 'other' }
  return { kind: 'file', hash: hashContent(await Bun.file(path).bytes()) }
}

const runGit = async (dir: string, args: readonly string[]): Promise<GitResult> => {
  const result = await $`git -C ${dir} ${args}`.quiet().nothrow()
  return {
    isOk: result.exitCode === 0,
    output: result.stdout.toString().replace(TRAILING_NEWLINE_PATTERN, ''),
    error: result.stderr.toString().trim().split('\n')[0] ?? '',
  }
}

const listRootCommits = async (dir: string) => {
  const result = await runGit(dir, ['rev-list', '--max-parents=0', 'HEAD'])
  return result.isOk ? result.output.split('\n') : []
}

const hasCommit = async (dir: string, commit: string) =>
  (await runGit(dir, ['cat-file', '-e', `${commit}^{commit}`])).isOk

const printRefusal = (problems: readonly string[]) => {
  console.error(['Refusing to install; nothing was changed:', ...problems.map((problem) => `  ${problem}`)].join('\n'))
  return EXIT_FAILED
}

const refuseWith = (problems: string[]): Preparation => ({ problems, warnings: [], notes: [] })

const parseSetNames = (value: string) => {
  const names = value.split(',').map((name) => name.trim())
  if (!names.every(isSetName)) throw new Error(`--sets takes a comma-separated list of ${SET_NAMES.join(', ')}`)
  return names
}

const parseOptions = (args: string[]): Options => {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean' },
      force: { type: 'boolean' },
      sets: { type: 'string', multiple: true },
    },
  })
  const [target, ...rest] = positionals
  if (target === undefined || target.trim() === '' || rest.length > 0) {
    throw new Error('Give exactly one target directory.')
  }
  return {
    target: resolve(target),
    sets: values.sets === undefined ? undefined : parseSetNames(values.sets.join(',')),
    isDryRun: values['dry-run'] === true,
    isForced: values.force === true,
  }
}

const readOptions = () => {
  try {
    return parseOptions(Bun.argv.slice(2))
  } catch (error) {
    console.error(`${describeError(error)}\n${USAGE}`)
    return undefined
  }
}

const checkSource = async () => {
  const toplevel = await runGit(SOURCE_ROOT, ['rev-parse', '--show-toplevel'])
  if (!toplevel.isOk) return [`skillster at ${SOURCE_ROOT} isn't usable as a git working tree: ${toplevel.error}`]
  const [root, sourceRoot, head] = await Promise.all([
    realpath(toplevel.output),
    realpath(SOURCE_ROOT),
    runGit(SOURCE_ROOT, ['rev-parse', '--verify', '--quiet', 'HEAD']),
  ])
  if (root === sourceRoot && head.isOk) return []
  return [`skillster has to run from its own git repository with at least one commit, which ${SOURCE_ROOT} isn't`]
}

// Related repositories share history: a root commit of either one exists in the other. That
// catches skillster itself, its worktrees and its clones, shallow ones included.
const isSkillster = async (dir: string) => {
  const [targetRoots, sourceRoots] = await Promise.all([listRootCommits(dir), listRootCommits(SOURCE_ROOT)])
  const found = await Promise.all([
    ...targetRoots.map((commit) => hasCommit(SOURCE_ROOT, commit)),
    ...sourceRoots.map((commit) => hasCommit(dir, commit)),
  ])
  return found.includes(true)
}

// The home folder's .claude/ is the user-level setup, and a dotfiles repo may link its own there.
const isUserSetup = async (root: string) => {
  const [home, claudeDir, userClaudeDir] = await Promise.all([
    realpath(homedir()),
    readIfExists(() => realpath(join(root, CLAUDE_DIR_NAME))),
    readIfExists(() => realpath(USER_CLAUDE_DIR)),
  ])
  return root === home || (claudeDir !== undefined && claudeDir === userClaudeDir)
}

const checkTarget = async (target: string) => {
  if (!(await isDirectory(target))) return [`${target} isn't a directory`]
  const toplevel = await runGit(target, ['rev-parse', '--show-toplevel'])
  if (!toplevel.isOk) return [`${target} isn't usable as a git working tree: ${toplevel.error}`]
  const [root, realTarget] = await Promise.all([realpath(toplevel.output), realpath(target)])
  if (root !== realTarget) {
    return [`${target} isn't the root of its repository (${root} is); agents in a subfolder aren't found from the root`]
  }
  if (await isUserSetup(root)) return [`${target} would install into ${USER_CLAUDE_LABEL}, your user-level setup`]
  return (await isSkillster(target)) ? [`${target} is a checkout of skillster itself`] : []
}

const checkSourceAndTarget = async (target: string) => {
  const sourceProblems = await checkSource()
  return sourceProblems.length > 0 ? sourceProblems : checkTarget(target)
}

const isCopySetPath = (file: string) =>
  COPY_SET_PATH_PATTERN.test(file) && posix.normalize(file) === file && !file.endsWith('/') && isPortablePath(file)

const isHashOfCopySetFile = ([file, hash]: [string, unknown]) =>
  isCopySetPath(file) && typeof hash === 'string' && HASH_PATTERN.test(hash)

const isManifest = (value: unknown): value is Manifest =>
  isRecord(value) &&
  typeof value.commit === 'string' &&
  Array.isArray(value.sets) &&
  value.sets.every((set) => typeof set === 'string') &&
  isRecord(value.files) &&
  Object.entries(value.files).every(isHashOfCopySetFile)

// The manifest decides what gets overwritten or deleted, so anything unexpected in it stops the install.
const readManifest = async (path: string): Promise<{ manifest?: Manifest; problems: string[] }> => {
  const stats = await readIfExists(() => lstat(path))
  if (stats === undefined) return { problems: [] }
  const parsed = stats.isFile() ? parseJsonc(await Bun.file(path).text()) : undefined
  if (isManifest(parsed)) return { manifest: parsed, problems: [] }
  return {
    problems: [
      `${claudePath(MANIFEST_FILE)} isn't a valid skillster manifest; restore it from git, or delete it and choose ` +
        'the sets with --sets',
    ],
  }
}

const listInstalled = (manifest: Manifest | undefined) => new Map(Object.entries(manifest?.files ?? {}))

const loadShippedFile = async (file: string) => {
  const path = join(COPY_SET_DIR, file)
  const [bytes, stats] = await Promise.all([Bun.file(path).bytes(), stat(path)])
  const mode = (stats.mode & EXECUTE_BITS) === 0 ? FILE_MODE : EXECUTABLE_FILE_MODE
  return [file, { hash: hashContent(bytes), mode, bytes }] as const
}

const loadShippedFiles = async (files: readonly string[]) =>
  new Map<string, ShippedFile>(await Promise.all(files.map(loadShippedFile)))

const checkFiles = async (
  claudeDir: string,
  shipped: ReadonlyMap<string, ShippedFile>,
  installed: ReadonlyMap<string, string>
) => {
  const files = [...new Set([...shipped.keys(), ...installed.keys()])].toSorted()
  return Promise.all(
    files.map(
      async (file): Promise<FileCheck> => ({
        file,
        shipped: shipped.get(file),
        installedHash: installed.get(file),
        state: await inspectFile(join(claudeDir, file)),
      })
    )
  )
}

const readPackageJson = async (target: string) => {
  const packageFile = Bun.file(join(target, PACKAGE_FILE))
  return (await packageFile.exists()) ? parseJsonc(await packageFile.text()) : undefined
}

const dependsOn = (packageJson: unknown, name: string) =>
  isRecord(packageJson) && DEPENDENCY_FIELDS.some((field) => hasKey(packageJson[field], name))

const listScripts = (packageJson: unknown) => {
  const scripts = isRecord(packageJson) && isRecord(packageJson.scripts) ? Object.entries(packageJson.scripts) : []
  return scripts.flatMap(([name, script]) => (typeof script === 'string' ? [{ name, script }] : []))
}

// The words of each command in a package script. A separator inside quotes, as in a glob, doesn't end
// the command; quoted words with spaces still come apart, which the checks below don't mind.
const splitCommands = (script: string) =>
  script
    .replace(QUOTED_PATTERN, (quoted) => quoted.replace(COMMAND_SEPARATOR_PATTERN, ' '))
    .split(COMMAND_SEPARATOR_PATTERN)
    .map((command) => command.replace(QUOTE_PATTERN, '').trim().split(WORD_SEPARATOR_PATTERN))

const isPrettierWord = (word: string) =>
  word === PRETTIER_PACKAGE || word.startsWith(`${PRETTIER_PACKAGE}@`) || PRETTIER_PATH_PATTERN.test(word)

// Only the command itself counts, past env assignments, runners and their options: eslint --plugin
// prettier doesn't run Prettier.
const runsPrettier = (words: readonly string[]) => {
  const command = words.find(
    (word) => !(RUNNER_WORDS.has(word) || word.startsWith('-') || ENV_ASSIGNMENT_PATTERN.test(word))
  )
  return command !== undefined && isPrettierWord(command)
}

const listIgnorePaths = (words: readonly string[]) =>
  words.flatMap((word, index) => {
    if (word === IGNORE_PATH_OPTION) return [words[index + 1] ?? '']
    return word.startsWith(`${IGNORE_PATH_OPTION}=`) ? [word.slice(IGNORE_PATH_OPTION.length + 1)] : []
  })

// Prettier reads ignore paths from where the script runs, the target. An unreadable one keeps nothing out.
const keepsPrettierOut = async (target: string, ignorePath: string) => {
  const path = resolve(target, ignorePath)
  if (path === resolve(target, PRETTIER_IGNORE_FILE)) return true
  try {
    return listsClaudeDir(await Bun.file(path).text())
  } catch {
    return false
  }
}

// Any --ignore-path replaces Prettier's default pair of .gitignore and .prettierignore, so one of the
// files it names has to keep Prettier out of .claude/ instead.
const leaksIntoClaudeDir = async (target: string, words: readonly string[]) => {
  const ignorePaths = listIgnorePaths(words)
  if (!runsPrettier(words) || ignorePaths.length === 0) return false
  const kept = await Promise.all(ignorePaths.map((path) => keepsPrettierOut(target, path)))
  return !kept.includes(true)
}

const usesPrettier = async (target: string, packageJson: unknown) =>
  (await readdir(target)).some((name) => PRETTIER_FILE_PATTERN.test(name)) ||
  hasKey(packageJson, PRETTIER_PACKAGE) ||
  dependsOn(packageJson, PRETTIER_PACKAGE) ||
  listScripts(packageJson).some(({ script }) => splitCommands(script).some(runsPrettier))

const stripIgnoreAnchors = (pattern: string) =>
  pattern.replace(IGNORE_PREFIX_PATTERN, '').replace(IGNORE_SUFFIX_PATTERN, '')

// A line about .claude itself, or a negation that brings back something inside it.
const isAboutClaudeDir = (line: string) => {
  const isNegated = IGNORE_NEGATION_PATTERN.test(line)
  const pattern = stripIgnoreAnchors(line.replace(IGNORE_NEGATION_PATTERN, ''))
  return pattern === CLAUDE_DIR_NAME || (isNegated && pattern.startsWith(`${CLAUDE_DIR_NAME}/`))
}

// As in .gitignore, the last matching line wins, and leading spaces count where trailing ones don't.
const listsClaudeDir = (ignoreText: string) => {
  const lastMatch = ignoreText
    .split('\n')
    .map((line) => line.trimEnd())
    .findLast(isAboutClaudeDir)
  return lastMatch !== undefined && !IGNORE_NEGATION_PATTERN.test(lastMatch)
}

const planPrettierIgnore = async (target: string, packageJson: unknown): Promise<PrettierIgnorePlan> => {
  if (!(await usesPrettier(target, packageJson))) return {}
  const path = join(target, PRETTIER_IGNORE_FILE)
  const stats = await readIfExists(() => lstat(path))
  if (stats && !stats.isFile() && !stats.isSymbolicLink()) return { problem: `${PRETTIER_IGNORE_FILE} isn't a file` }
  const text = stats ? ((await readIfExists(() => Bun.file(path).text())) ?? '') : ''
  if (listsClaudeDir(text)) return {}
  if (stats?.isSymbolicLink()) {
    return { problem: `${PRETTIER_IGNORE_FILE} is a symlink; add ${CLAUDE_DIR_NAME}/ to the file it points to` }
  }
  const lineEnding = text.includes('\r\n') ? '\r\n' : '\n'
  const separator = text === '' || text.endsWith('\n') ? '' : lineEnding
  return { append: `${separator}${CLAUDE_DIR_NAME}/${lineEnding}` }
}

// Without --sets a re-install reuses the manifest's sets, so a name skillster doesn't know mustn't
// quietly drop files.
const findManifestSetProblems = (options: Options, manifest: Manifest | undefined) => {
  if (options.sets !== undefined || manifest === undefined) return []
  const unknown = manifest.sets.filter((set) => !isSetName(set))
  if (unknown.length === 0 && manifest.sets.length > 0) return []
  const listed = unknown.length > 0 ? `lists sets skillster doesn't have (${unknown.join(', ')})` : 'lists no sets'
  return [`${claudePath(MANIFEST_FILE)} ${listed}; choose the sets with --sets`]
}

// Without --sets, a re-install keeps the sets of the last one, and a first install takes them all.
const chooseSets = (options: Options, previous: Manifest | undefined) =>
  resolveSets(options.sets ?? previous?.sets.filter(isSetName) ?? SET_NAMES)

const buildPlan = async (
  options: Options,
  previous: Manifest | undefined,
  copySetFiles: readonly string[]
): Promise<Plan> => {
  const sets = chooseSets(options, previous)
  const claudeDir = join(options.target, CLAUDE_DIR_NAME)
  const packageJson = await readPackageJson(options.target)
  const files = copySetFiles.filter((file) => findOwnerSets(file).some((owner) => sets.includes(owner)))
  return {
    target: options.target,
    claudeDir,
    sets,
    commit: (await runGit(SOURCE_ROOT, ['rev-parse', 'HEAD'])).output,
    previous,
    packageJson,
    checks: await checkFiles(claudeDir, await loadShippedFiles(files), listInstalled(previous)),
    prettierIgnore: await planPrettierIgnore(options.target, packageJson),
  }
}

// A file already identical to the shipped one is adopted: it can't be told apart from one this
// installer wrote, which is also how a re-run finishes an interrupted install. Modes aren't
// compared, since on a filesystem without Unix modes every file would look changed.
const findAction = ({ state, shipped, installedHash }: FileCheck): Action | undefined => {
  if (shipped === undefined) return state.kind === 'file' ? 'delete' : undefined
  if (state.kind === 'missing') return 'create'
  if (state.kind === 'other' || state.hash !== shipped.hash) return 'update'
  return installedHash === undefined ? 'adopt' : 'keep'
}

const isChange = (action: Action | undefined) => action === 'create' || action === 'update' || action === 'delete'

const isLocallyEdited = ({ state, shipped, installedHash }: FileCheck) =>
  state.kind === 'file' && installedHash !== undefined && state.hash !== installedHash && state.hash !== shipped?.hash

const findFileProblem = (check: FileCheck, isForced: boolean) => {
  const { file, shipped, state, installedHash } = check
  if (shipped && state.kind === 'other') return `${claudePath(file)} isn't a regular file; move it out of the way`
  if (state.kind === 'file' && installedHash === undefined && state.hash !== shipped?.hash) {
    return `${claudePath(file)} has other content and wasn't installed by skillster; remove or rename it`
  }
  if (!isLocallyEdited(check) || isForced) return undefined
  const fix = shipped ? 'overwrite' : 'delete'
  return `${claudePath(file)} has local edits; save them elsewhere and re-run with --force to ${fix} it`
}

const listParentFolders = (file: string) => {
  const parts = file.split('/').slice(0, -1)
  return ['', ...parts.map((_, index) => parts.slice(0, index + 1).join('/'))]
}

const findFolderProblem = async (claudeDir: string, folder: string) => {
  const stats = await readIfExists(() => lstat(join(claudeDir, folder)))
  if (stats?.isSymbolicLink()) return `${claudePath(folder)} is a symlink; the installer only copies into real folders`
  return stats && !stats.isDirectory() ? `${claudePath(folder)} is in the way: it should be a folder` : undefined
}

const findFolderProblems = async (claudeDir: string, files: readonly string[]) => {
  const folders = [...new Set(files.flatMap(listParentFolders))].toSorted()
  const problems = await Promise.all(folders.map((folder) => findFolderProblem(claudeDir, folder)))
  return problems.filter((problem) => problem !== undefined)
}

const findUnwritable = async (paths: readonly string[]) => {
  const unique = [...new Set(paths)]
  const writable = await Promise.all(unique.map(canWrite))
  return unique.filter((_, index) => !writable[index]).map((path) => `${path} isn't writable`)
}

// The manifest and .prettierignore are written last, so a plain permission problem is caught up front.
const findWriteProblems = async (plan: Plan) => {
  const manifestFolder = (await isDirectory(plan.claudeDir)) ? plan.claudeDir : plan.target
  if (plan.prettierIgnore.append === undefined) return findUnwritable([manifestFolder])
  const ignorePath = join(plan.target, PRETTIER_IGNORE_FILE)
  return findUnwritable([manifestFolder, (await Bun.file(ignorePath).exists()) ? ignorePath : plan.target])
}

const listOurNames = (sets: readonly SetName[], kind: 'skills' | 'agents') =>
  new Set(sets.flatMap((set) => LANGUAGE_SETS[set][kind]).map(normalizeName))

const readName = (frontmatter: Record<string, unknown> | undefined) => {
  const name = frontmatter?.name
  return typeof name === 'string' && name.trim() !== '' ? name : undefined
}

// Claude Code skips an agent without a description, so only described agents can collide.
const readAgentName = async (path: string) => {
  const frontmatter = await readClaudeCodeFrontmatter(path)
  return isText(frontmatter?.description) ? readName(frontmatter) : undefined
}

const findAgentCollisions = async (plan: Plan, ownFiles: ReadonlySet<string>) => {
  const ourAgents = listOurNames(plan.sets, 'agents')
  const files = (await scanFiles(plan.claudeDir, AGENT_FILES)).filter((file) => !ownFiles.has(file))
  const agents = await Promise.all(
    files.map(async (file) => ({ file, name: await readAgentName(join(plan.claudeDir, file)) }))
  )
  return agents.flatMap(({ file, name }) =>
    name !== undefined && ourAgents.has(normalizeName(name))
      ? [`${claudePath(file)} declares the agent name "${name}", which skillster installs; rename or remove it`]
      : []
  )
}

// A skill answers to its folder name and to the name its frontmatter declares.
const findCollidingSkills = async (skillsDir: string, ourSkills: ReadonlySet<string>) => {
  const files = await scanFiles(skillsDir, SKILL_FILES)
  const skills = await Promise.all(
    files.map(async (file) => {
      const folder = dirname(file)
      const names = [folder, readName(await readClaudeCodeFrontmatter(join(skillsDir, file)))]
      return { folder, name: names.find((name) => name !== undefined && ourSkills.has(normalizeName(name))) }
    })
  )
  return skills.flatMap(({ folder, name }) => (name === undefined ? [] : [{ folder, name }]))
}

const findSkillCollisions = async (plan: Plan, ownFiles: ReadonlySet<string>) => {
  const skills = await findCollidingSkills(join(plan.claudeDir, SKILLS_FOLDER), listOurNames(plan.sets, 'skills'))
  return skills
    .filter(({ folder }) => !ownFiles.has(`${SKILLS_FOLDER}/${folder}/${SKILL_FILE}`))
    .map(
      ({ folder, name }) =>
        `${claudePath(`${SKILLS_FOLDER}/${folder}`)} is a skill named "${name}", which skillster installs; rename or remove it`
    )
}

// A command takes its name from its file, and a skill with the same name hides it.
const findCommandCollisions = async (plan: Plan) => {
  const ourSkills = listOurNames(plan.sets, 'skills')
  const files = await scanFiles(join(plan.claudeDir, COMMANDS_FOLDER), COMMAND_FILES)
  return files.flatMap((file) => {
    const name = basename(file, MARKDOWN_EXTENSION)
    if (!ourSkills.has(normalizeName(name))) return []
    const path = claudePath(`${COMMANDS_FOLDER}/${file}`)
    return [`${path} is the command /${name}, which skillster's skill of that name would hide; rename or remove it`]
  })
}

const findProblems = async (plan: Plan, isForced: boolean) => {
  const ownFiles = new Set(plan.checks.map((check) => check.file))
  const changedFiles = plan.checks.filter((check) => isChange(findAction(check))).map((check) => check.file)
  return [
    ...(await findFolderProblems(plan.claudeDir, [...changedFiles, MANIFEST_FILE])),
    ...plan.checks.flatMap((check) => findFileProblem(check, isForced) ?? []),
    ...(plan.prettierIgnore.problem === undefined ? [] : [plan.prettierIgnore.problem]),
    ...(await findWriteProblems(plan)),
    ...(await findAgentCollisions(plan, ownFiles)),
    ...(await findSkillCollisions(plan, ownFiles)),
    ...(await findCommandCollisions(plan)),
  ]
}

// Only a warning depends on this scan, so an unreadable personal skill mustn't stop the install.
const findPersonalOverrides = async (sets: readonly SetName[]) => {
  try {
    const overrides = await findCollidingSkills(PERSONAL_SKILLS_DIR, listOurNames(sets, 'skills'))
    return overrides.map(
      ({ folder, name }) =>
        `${PERSONAL_SKILLS_LABEL}/${folder} is a personal skill named "${name}", and personal skills override project ones`
    )
  } catch (error) {
    return [`couldn't check ${PERSONAL_SKILLS_LABEL}: ${describeError(error)}`]
  }
}

const findLeakyScripts = async (target: string, packageJson: unknown) => {
  const scripts = await Promise.all(
    listScripts(packageJson).map(async ({ name, script }) => {
      const leaks = await Promise.all(splitCommands(script).map((words) => leaksIntoClaudeDir(target, words)))
      return leaks.includes(true) ? [name] : []
    })
  )
  return scripts.flat()
}

const findPrettierScriptWarnings = async (target: string, packageJson: unknown) =>
  (await findLeakyScripts(target, packageJson)).map(
    (name) =>
      `the "${name}" script gives Prettier an ${IGNORE_PATH_OPTION} that doesn't keep it out of ` +
      `${CLAUDE_DIR_NAME}/, so it may format or check files there; on Prettier 3, add ` +
      `${IGNORE_PATH_OPTION} ${PRETTIER_IGNORE_FILE} to it`
  )

const findWarnings = async (plan: Plan) => {
  const isDirty = await hasUncommittedChanges()
  return [
    ...(await findPersonalOverrides(plan.sets)),
    ...(await findPrettierScriptWarnings(plan.target, plan.packageJson)),
    ...(isDirty ? ["the copy set has uncommitted changes, which the manifest's commit doesn't include"] : []),
  ]
}

const findBiomeConfig = async (target: string) => {
  const names = new Set(await readdir(target))
  return BIOME_CONFIG_FILES.find((name) => names.has(name))
}

const isBiomeExclusionOfClaudeDir = (entry: unknown) =>
  typeof entry === 'string' &&
  BIOME_NEGATION_PATTERN.test(entry) &&
  entry.replace(BIOME_NEGATION_PATTERN, '').replace(BIOME_PREFIX_PATTERN, '').replace(BIOME_SUFFIX_PATTERN, '') ===
    CLAUDE_DIR_NAME

// Biome only honors negated entries that come after "**".
const excludesClaudeDir = (config: unknown) => {
  const files = isRecord(config) ? config.files : undefined
  const includes: unknown[] = isRecord(files) && Array.isArray(files.includes) ? files.includes : []
  const everythingIndex = includes.indexOf(BIOME_EVERYTHING)
  return everythingIndex !== -1 && includes.slice(everythingIndex + 1).some(isBiomeExclusionOfClaudeDir)
}

const findBiomeHint = async (target: string) => {
  const config = await findBiomeConfig(target)
  if (config === undefined) return []
  const text = await readIfExists(() => Bun.file(join(target, config)).text())
  if (text !== undefined && excludesClaudeDir(parseJsonc(text))) return []
  const entry = `"!**/${CLAUDE_DIR_NAME}"`
  return [`Biome: add ${entry} to files.includes in ${config}, after "**"; the installer doesn't edit Biome configs.`]
}

const findLeftOutSets = ({ sets, packageJson }: Plan) =>
  SET_NAMES.flatMap((set) => {
    const marker = SET_MARKER_PACKAGES[set]
    return marker !== undefined && !sets.includes(set) && dependsOn(packageJson, marker) ? [{ set, marker }] : []
  })

const findLeftOutSetsHint = (plan: Plan) => {
  const leftOut = findLeftOutSets(plan)
  if (leftOut.length === 0) return []
  const listed = leftOut.map(({ set, marker }) => `${set} (${marker})`).join(', ')
  const suggested = SET_NAMES.filter((set) => plan.sets.includes(set) || leftOut.some((entry) => entry.set === set))
  return [
    `${PACKAGE_FILE} suggests sets this install leaves out: ${listed}. Add them with --sets ${suggested.join(',')}.`,
  ]
}

const findNotes = async (plan: Plan) => {
  const sets = plan.sets.join(', ')
  const previousSets = plan.previous?.sets.join(', ') ?? sets
  const setChange = previousSets === sets ? [] : [`Sets change from ${previousSets} to ${sets}.`]
  return [...setChange, ...findLeftOutSetsHint(plan), ...(await findBiomeHint(plan.target))]
}

const planInstall = async (options: Options): Promise<Preparation> => {
  const sourceAndTargetProblems = await checkSourceAndTarget(options.target)
  if (sourceAndTargetProblems.length > 0) return refuseWith(sourceAndTargetProblems)
  const copySetFiles = await listCopySetFiles()
  const setProblems = await findSetProblems(copySetFiles)
  if (setProblems.length > 0) return refuseWith([...setProblems, SET_PROBLEMS_HINT])
  const manifestPath = join(options.target, CLAUDE_DIR_NAME, MANIFEST_FILE)
  const { manifest, problems: readProblems } = await readManifest(manifestPath)
  const manifestProblems = [...readProblems, ...findManifestSetProblems(options, manifest)]
  if (manifestProblems.length > 0) return refuseWith(manifestProblems)
  const plan = await buildPlan(options, manifest, copySetFiles)
  const [problems, warnings, notes] = await Promise.all([
    findProblems(plan, options.isForced),
    findWarnings(plan),
    findNotes(plan),
  ])
  return { plan, problems, warnings, notes }
}

// Planning only reads, so any error in it can stop the install before anything is written.
const prepareInstall = async (options: Options) => {
  try {
    return await planInstall(options)
  } catch (error) {
    return refuseWith([`couldn't check the install: ${describeError(error)}`])
  }
}

const describeNote = (check: FileCheck, action: Action) => {
  if (isLocallyEdited(check)) return ' (local edits, --force)'
  return action === 'adopt' ? ' (already identical)' : ''
}

const describeCheck = (check: FileCheck, isForced: boolean) => {
  const action = findAction(check)
  if (action === undefined || action === 'keep' || findFileProblem(check, isForced) !== undefined) return []
  return [`${formatStep(action, claudePath(check.file))}${describeNote(check, action)}`]
}

const printPlan = (plan: Plan, options: Options) => {
  const keptCount = plan.checks.filter((check) => findAction(check) === 'keep').length
  const source = `skillster ${plan.commit.slice(0, SHORT_COMMIT_LENGTH)}`
  console.log(
    `Installing ${plan.sets.join(', ')} from ${source} into ${plan.target}${options.isDryRun ? ' (dry run)' : ''}`
  )
  for (const line of plan.checks.flatMap((check) => describeCheck(check, options.isForced))) console.log(line)
  if (plan.prettierIgnore.append !== undefined) {
    console.log(formatStep('add', `${CLAUDE_DIR_NAME}/ to ${PRETTIER_IGNORE_FILE}`))
  }
  console.log(formatStep('write', claudePath(MANIFEST_FILE)))
  if (keptCount > 0) console.log(`  ${keptCount} files already up to date`)
}

const printMessages = ({ notes, warnings }: Preparation) => {
  for (const note of notes) console.log(note)
  for (const warning of warnings) console.warn(`Warning: ${warning}`)
}

const removeEmptyFolders = async (folder: string, stopFolder: string): Promise<void> => {
  if (folder === stopFolder || (await readdir(folder)).length > 0) return
  await rmdir(folder)
  await removeEmptyFolders(dirname(folder), stopFolder)
}

// Whatever is at the destination goes first, so a symlink there is unlinked rather than followed and
// a hard link elsewhere keeps its content. node:fs because Bun.write can't create a file exclusively.
const writeFresh = async (path: string, data: Uint8Array | string, mode: number) => {
  await readIfExists(() => Bun.file(path).delete())
  const handle = await open(path, 'wx', mode)
  try {
    await handle.writeFile(data)
  } finally {
    await handle.close()
  }
}

const applyCheck = async (claudeDir: string, check: FileCheck) => {
  const path = join(claudeDir, check.file)
  const action = findAction(check)
  if (action === 'delete') {
    await Bun.file(path).delete()
    await removeEmptyFolders(dirname(path), claudeDir)
  } else if (check.shipped && (action === 'create' || action === 'update')) {
    await mkdir(dirname(path), { recursive: true })
    await writeFresh(path, check.shipped.bytes, check.shipped.mode)
  }
}

const formatManifest = (plan: Plan) => {
  const files = Object.fromEntries(
    plan.checks.flatMap(({ file, shipped }) => (shipped ? [[file, shipped.hash] as const] : []))
  )
  const manifest: Manifest = { commit: plan.commit, sets: plan.sets, files }
  return `${JSON.stringify(manifest, undefined, 2)}\n`
}

const applyPlan = async (plan: Plan) => {
  try {
    // One at a time, in path order, so an interrupted run leaves a predictable state behind.
    for (const check of plan.checks) await applyCheck(plan.claudeDir, check)
    // Appended in place: it's the project's file, so its own bytes, mode and links stay as they are.
    if (plan.prettierIgnore.append !== undefined) {
      await appendFile(join(plan.target, PRETTIER_IGNORE_FILE), plan.prettierIgnore.append)
    }
    await writeFresh(join(plan.claudeDir, MANIFEST_FILE), formatManifest(plan), FILE_MODE)
  } catch (error) {
    console.error(`Install stopped partway: ${describeError(error)}`)
    console.error(describeInterruptedHint(plan.sets))
    return EXIT_FAILED
  }
  console.log('Installed.')
  return EXIT_OK
}

const main = async () => {
  const options = readOptions()
  if (options === undefined) return EXIT_FAILED
  const preparation = await prepareInstall(options)
  if (preparation.plan) printPlan(preparation.plan, options)
  printMessages(preparation)
  if (preparation.plan === undefined || preparation.problems.length > 0) return printRefusal(preparation.problems)
  if (options.isDryRun) {
    console.log('Dry run: nothing was changed.')
    return EXIT_OK
  }
  return applyPlan(preparation.plan)
}

process.exitCode = await main()
