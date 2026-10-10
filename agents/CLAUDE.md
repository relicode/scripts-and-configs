# skillster

The source for the Claude Code setup that gets copied into other projects. Work in this repo is mostly on that setup: rules, skills and agents.

## The copy set

`.claude/rules/`, `.claude/skills/` and `.claude/agents/` are copied as-is, so everything in them has to work in any project:

- Self-contained: no absolute paths, no `~/etc`, no `../`, nothing that assumes this repo. Skills refer to their own files through `${CLAUDE_SKILL_DIR}` or their base directory.
- Real files only: `lint:claude` rejects symlinks and submodules in these folders.
- Skills and agents are flat: `skills/<name>/SKILL.md` and `agents/<name>.md`, with the folder or file name equal to `name:`. Rules are grouped by language set. No `.claude/commands/`.
- No docs, notes, evals or test output inside these folders. skill-creator puts its workspace next to the skill by default; put it outside `.claude/` instead.

Everything else (`CLAUDE.md`, `package.json`, configs, `scripts/`, `src/`) belongs to this repo only.

## Language sets

The core works for any language. Each other set adds one language or framework and can be dropped or swapped: a Kotlin project keeps the core, drops the JS/TS and React sets, and adds `rules/kotlin/`, `review-kotlin` and `reviewer-k`.

| Set | Rules | Skills | Agents |
| --- | --- | --- | --- |
| Core (`core`) | `clean-code.md` | `review-generic` | `reviewer` |
| JS/TS and Bun (`js`) | `js/typescript.md`, `js/lint-and-format.md`, `js/bun.md` | `review-bun`, `best-practices-bun` | `reviewer-b` |
| React (`react`, needs `js`) | `js/react.md` | `review-react`, `best-practices-react` | `reviewer-r` |

`scripts/copy-set.ts` holds this mapping for the installer and `lint:claude`, so a new rule, skill or agent goes into a set there too: lint fails while a copy-set file is in no set or in two, or a listed one is missing. Only files git would commit count, so gitignored ones never ship.

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

Run `bun scripts/install.ts <target> [--dry-run] [--sets core,js,react] [--force]` from a clean commit of this repo: the manifest records `HEAD`, and the installer warns about uncommitted copy-set changes. It has no package script on purpose: one named `install` would run on every `bun install`.

- The target must be a git repository root that isn't skillster, a clone of it or your home folder: in a monorepo package, the agents aren't found from the root.
- `--sets` defaults to all sets. `core` is always included, and `react` brings `js`.
- Files are copied, never symlinked, and never written through a symlink: rules reached through a symlink need approval, and the scoped ones don't load at all.
- Nothing is written until every check passes. The installer refuses when a file it would write holds other content and isn't in its manifest, or when an agent, skill or top-level command elsewhere in the target's `.claude/` uses one of our names: duplicate agent names resolve arbitrarily, and a skill hides a command. A file that's already identical is adopted. It warns when `~/.claude/skills` has a skill with one of our names, since that one would win.
- `.claude/skillster-manifest.json` in the target records this repo's commit, the sets and a sha256 per installed file. Re-installing deletes files that are no longer shipped, and refuses to overwrite or delete a locally edited one unless `--force` is given. After an interrupted install, re-run the same command from the same commit: files that landed are adopted, and one cut off mid-write is refused until you delete it.
- It adds `.claude/` to `.prettierignore` when the target uses Prettier. For Biome it prints the `files.includes` entry to add unless the config already excludes `.claude`, as this repo's `biome.jsonc` does, and leaves the config alone.
- `--dry-run` prints the plan and changes nothing.

## Third-party skills

None at the moment. A vendored skill keeps its upstream name and its files unmodified, so it can be re-pulled; editing one makes it ours, so rename it and drop it from this list.

`best-practices-react` and `best-practices-bun` were forked that way from Vercel Engineering's react-best-practices (MIT); keep the attribution in their files and the `LICENSE.txt` in each folder, since the installer copies them into every project.

## This repo

- Check changes with `bun run format`, then `bun run lint`. Its `lint:claude` leg (`scripts/lint-claude.ts`) checks the copy set: names match folders and files, preloaded skills exist, rule frontmatter parses, and every file is in exactly one language set.
- `src/index-before.ts` is a deliberately buggy review sample, excluded from Biome and `tsc`. `src/index-after.ts` is its reviewed version. Never point a reviewer at the before-file.
- Test agents and skills on throwaway copies outside the repo: the reviewers edit what they review.
