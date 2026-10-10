# skillster

The source for the Claude Code setup that gets copied into other projects. Work in this repo is mostly on that setup: rules, skills and agents.

## The copy set

`.claude/rules/`, `.claude/skills/` and `.claude/agents/` are copied as-is, so everything in them has to work in any project:

- Self-contained: no absolute paths, no `~/etc`, no `../`, nothing that assumes this repo. Skills refer to their own files through `${CLAUDE_SKILL_DIR}` or their base directory.
- Skills and agents are flat: `skills/<name>/SKILL.md` and `agents/<name>.md`, with the folder or file name equal to `name:`. Rules are grouped by language set. No `.claude/commands/`.
- No docs, notes, evals or test output inside these folders. skill-creator puts its workspace next to the skill by default; put it outside `.claude/` instead.

Everything else (`CLAUDE.md`, `package.json`, configs, `scripts/`, `src/`) belongs to this repo only.

## Language sets

The core works for any language. Each other set adds one language or framework and can be dropped or swapped: a Kotlin project keeps the core, drops the JS/TS and React sets, and adds `rules/kotlin/`, `review-kotlin` and `reviewer-k`.

| Set | Rules | Skills | Agents |
| --- | --- | --- | --- |
| Core | `clean-code.md` | `review-generic` | `reviewer` |
| JS/TS and Bun | `js/typescript.md`, `js/lint-and-format.md`, `js/bun.md` | `review-bun` | `reviewer-b` |
| React | `js/react.md` | `review-react`, `react-best-practices` | `reviewer-r` |

## Where things go

- Rule: a standard that always applies. Scope language-specific rules with `paths:`. The built-in Explore and Plan agents skip rules, so restate what they must follow when delegating to them.
- Skill: a procedure or reference loaded on demand.
- Agent: a thin role that preloads skills through `skills:`. Procedures live in the skills, not in agent bodies.
- MCP server used by a single agent: inline in that agent's `mcpServers:`. Anything else goes in `.mcp.json`, which isn't copied.

## Naming

- Skills get descriptive names (`review-generic`, `review-bun`); agents get short ones that are quick to type (`reviewer`, `reviewer-b`).
- Don't reuse built-in or bundled names such as `review`, `init`, `run`, `simplify` or `code-review`: a project skill replaces them.
- A personal skill in `~/.claude/skills` silently overrides a project skill with the same name. For agents it's the other way round.

## Installing into a project

- Copy, never symlink: rules reached through a symlink need approval, and the scoped ones don't load at all.
- Install at the repository root. In a monorepo package, the agents aren't found from the root.
- Check the project's own `.claude/` for name collisions first: a copy overwrites same-named files silently, and duplicate agent names resolve arbitrarily.
- Add `.claude/` to the project's formatter ignores (`.prettierignore`, Biome `files.includes`), as this repo's `biome.jsonc` does.
- When re-copying, delete what was removed or renamed here. A copy never removes old files.

## Third-party skills

Kept unmodified under their upstream names, so they can be re-pulled:

- `react-best-practices`: Vercel Engineering (MIT), from davila7/claude-code-templates `main` at `b84033e` (2026-10-12). Its `references/rules/download_rules.sh` is upstream's refresh script and downloads into the current directory; don't run it.

An edited third-party skill becomes ours: rename it and remove it from this list.

## This repo

- Check changes with `bun run format`, then `bun run lint`. Its `lint:claude` leg (`scripts/lint-claude.ts`) checks the copy set: names match folders and files, preloaded skills exist, rule frontmatter parses.
- `src/index-before.ts` is a deliberately buggy review sample, excluded from Biome and `tsc`. `src/index-after.ts` is its reviewed version. Never point a reviewer at the before-file.
- Test agents and skills on throwaway copies outside the repo: the reviewers edit what they review.
