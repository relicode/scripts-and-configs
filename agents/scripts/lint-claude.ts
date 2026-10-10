// Structural checks for the copy set (.claude/rules, skills and agents). Biome skips
// .claude/, so this is what catches a renamed skill folder, a dangling `skills:` entry,
// rule frontmatter that no longer parses (Claude Code then loads that rule everywhere)
// or a file that isn't in exactly one language set.

import { readdir, stat } from 'node:fs/promises'

import {
  AGENTS_FOLDER,
  CLAUDE_DIR_NAME,
  COMMANDS_FOLDER,
  findSetProblems,
  hasFrontmatterFence,
  listCopySetFiles,
  RULES_FOLDER,
  readFrontmatter,
  SKILL_FILE,
  SKILLS_FOLDER,
} from './copy-set.ts'

const SKILLS_DIR = `${CLAUDE_DIR_NAME}/${SKILLS_FOLDER}`
const AGENTS_DIR = `${CLAUDE_DIR_NAME}/${AGENTS_FOLDER}`
const RULES_DIR = `${CLAUDE_DIR_NAME}/${RULES_FOLDER}`
const COMMANDS_DIR = `${CLAUDE_DIR_NAME}/${COMMANDS_FOLDER}`
const MAX_DESCRIPTION_LENGTH = 1024

const problemIf = (condition: boolean, problem: string) => (condition ? [problem] : [])

const hasText = (value: unknown) => typeof value === 'string' && value.trim() !== ''

const isGlobList = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(hasText)

const isDirectory = async (path: string) => {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

const listEntries = async (dir: string) => ((await isDirectory(dir)) ? readdir(dir, { withFileTypes: true }) : [])

const checkSkill = async (dir: string) => {
  const path = `${SKILLS_DIR}/${dir}/${SKILL_FILE}`
  if (!(await Bun.file(path).exists())) return [`${path}: missing; every folder in skills/ needs one`]
  const frontmatter = await readFrontmatter(path)
  if (!frontmatter) return [`${path}: frontmatter is missing or doesn't parse`]
  const { name, description } = frontmatter
  return [
    ...problemIf(name !== dir, `${path}: name "${String(name)}" doesn't match its folder`),
    ...problemIf(!hasText(description), `${path}: description is missing`),
    ...problemIf(
      String(description).length > MAX_DESCRIPTION_LENGTH,
      `${path}: description is over ${MAX_DESCRIPTION_LENGTH} characters`
    ),
    ...problemIf(/[<>]/.test(String(description)), `${path}: description contains < or >`),
  ]
}

const checkAgent = async (file: string, skillNames: ReadonlySet<string>) => {
  const path = `${AGENTS_DIR}/${file}`
  const frontmatter = await readFrontmatter(path)
  if (!frontmatter) return [`${path}: frontmatter is missing or doesn't parse`]
  const { name, description, skills = [] } = frontmatter
  if (!Array.isArray(skills)) return [`${path}: skills must be a list`]
  return [
    ...problemIf(`${String(name)}.md` !== file, `${path}: name "${String(name)}" doesn't match the file name`),
    ...problemIf(!hasText(description), `${path}: description is missing`),
    ...skills
      .filter((skill: unknown) => !skillNames.has(String(skill)))
      .map((skill: unknown) => `${path}: preloads missing skill "${String(skill)}"`),
  ]
}

const checkRule = async (file: string) => {
  const path = `${RULES_DIR}/${file}`
  if (!hasFrontmatterFence(await Bun.file(path).text())) return []
  const frontmatter = await readFrontmatter(path)
  if (!frontmatter) return [`${path}: frontmatter doesn't parse, so the rule would load everywhere`]
  return problemIf(
    frontmatter.paths !== undefined && !isGlobList(frontmatter.paths),
    `${path}: paths must be a non-empty list of globs`
  )
}

const skillEntries = await listEntries(SKILLS_DIR)
const agentEntries = await listEntries(AGENTS_DIR)

const skillDirs = skillEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
const agentFiles = agentEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => entry.name)
// Rules may sit in language-set subfolders (rules/js/…); Claude Code finds them recursively.
const ruleFiles = (await isDirectory(RULES_DIR))
  ? await Array.fromAsync(new Bun.Glob('**/*.md').scan({ cwd: RULES_DIR }))
  : []
const skillNames = new Set(skillDirs)

const problems = [
  ...problemIf(await isDirectory(COMMANDS_DIR), `${COMMANDS_DIR}: use skills instead of commands`),
  ...agentEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${AGENTS_DIR}/${entry.name}: keep agents flat`),
  ...(
    await Promise.all([
      ...skillDirs.map(checkSkill),
      ...agentFiles.map((file) => checkAgent(file, skillNames)),
      ...ruleFiles.map(checkRule),
    ])
  ).flat(),
  ...(await findSetProblems(await listCopySetFiles())),
]

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}

console.log(`✓ ${skillDirs.length} skills, ${agentFiles.length} agents, ${ruleFiles.length} rules`)
