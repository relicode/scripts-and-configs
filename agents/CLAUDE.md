# skillster

The source for the Claude Code setup that gets copied into other projects. Work in this repo is mostly on that setup: rules, skills, agents and the MCP servers that go with them.

## The copy set

`.claude/rules/`, `.claude/skills/` and `.claude/agents/` are copied as-is, so everything in them has to work in any project:

- Self-contained: no absolute paths, no `~/etc`, no `../`, nothing that assumes this repo. Skills refer to their own files through `${CLAUDE_SKILL_DIR}` or their base directory.
- Real files only: `lint:claude` rejects symlinks and submodules in these folders.
- Skills and agents are flat: `skills/<name>/SKILL.md` and `agents/<name>.md`, with the folder or file name equal to `name:`. Rules are grouped by language set. No `.claude/commands/`.
- No docs, notes, evals or test output inside these folders. skill-creator puts its workspace next to the skill by default; put it outside `.claude/` instead.

`.mcp.json` holds the sets' MCP servers, and the installer merges the chosen ones into the target's own. Sessions in this repo read it too and ask once to approve its servers. Everything in it ships, so a server only for work on this repo goes in local scope (`claude mcp add --scope local`).

Everything else (`CLAUDE.md`, `package.json`, configs, `scripts/`, `src/`) belongs to this repo only.

## Language sets

The core works for any language. Each other set adds one language, framework or platform and can be dropped or swapped: a Kotlin project keeps the core, drops `js` and the sets built on it, and adds `rules/kotlin/`, `review-kotlin`, `reviewer-kotlin` and `dev-kotlin`.

| Set | Rules | Skills | Agents | MCP servers |
| --- | --- | --- | --- | --- |
| Core (`core`) | `clean-code.md`, `scripts.md` | `review-generic`, `develop-generic` | `reviewer` | `context7` |
| JS/TS and Bun (`js`) | `js/typescript.md`, `js/lint-and-format.md`, `js/bun.md` | `review-bun`, `best-practices-bun` | `dev-bun`, `reviewer-bun` | — |
| Web (`web`, needs `js`) | — | — | — | `chrome-devtools` |
| React (`react`, needs `web`) | `js/react.md` | `review-react`, `best-practices-react` | `reviewer-react` | — |
| Next.js (`next`, needs `react`) | — | — | `dev-next`, `reviewer-next` | `next-devtools` |
| MUI (`mui`, needs `react`) | — | — | — | `mui-mcp` |
| Astro (`astro`, needs `react`) | — | — | `dev-astro`, `reviewer-astro` | `astro-docs` |
| Mobile browsers (`mobile`, needs `web`) | — | — | — | `maestro` |
| AWS (`aws`) | — | — | — | `aws-mcp` |

Each `dev-*` agent implements a task and hands its change to the reviewer its description names. The js rules also cover `.astro` files, whose frontmatter is TypeScript, and `lint-and-format.md` covers `.mdx` as well.

context7, astro-docs, mui-mcp and next-devtools look up library and framework docs; next-devtools also reads a running Next.js 16+ dev server. aws-mcp looks up AWS documentation, skills and regional availability through AWS's own SigV4 proxy. chrome-devtools drives a headless Chrome with a throwaway profile, and maestro drives mobile browsers on Android emulators and devices and iOS simulators through the Maestro CLI for end-to-end tests. next-devtools 0.4 doesn't use Playwright: its `browser_eval` tool only tells the agent how to install and run Vercel's agent-browser CLI, and it can't be switched off short of a permission rule denying `mcp__next-devtools__browser_eval`.

`scripts/copy-set.ts` holds this mapping for the installer and `lint:claude`, so a new rule, skill, agent or MCP server goes into a set there too: lint fails while a copy-set file or a server in `.mcp.json` is in no set or in two, a listed one is missing, or an agent preloads a skill its set doesn't bring. Only files git would commit count, so gitignored ones never ship. Lint checks the definitions in `.mcp.json` as well: a stdio server needs a command and args and an http one an https URL, a package that bunx, npx or uvx downloads names an exact version, and `env` and `headers` values are `${VAR}` references, so secrets stay in the environment.

## Where things go

- Rule: a standard that always applies. Scope language-specific rules with `paths:`. The built-in Explore and Plan agents skip rules, so restate what they must follow when delegating to them.
- Skill: a procedure or reference loaded on demand.
- Agent: a thin role that preloads skills through `skills:`. Procedures live in the skills, not in agent bodies.
- MCP server used by a single agent: inline in that agent's `mcpServers:`. Any other goes into `.mcp.json` and, by name, into the set it serves in `scripts/copy-set.ts`; the installer merges it into the target's `.mcp.json`.

## Naming

- Skills get descriptive names in one pattern, what they do and then what they cover (`review-generic`, `develop-generic`, `review-bun`, `best-practices-react`); agents get short ones, their role and then their stack, so each dev agent shares its stack name with its reviewer (`dev-bun` and `reviewer-bun`, `dev-next` and `reviewer-next`), and the generic reviewer is plain `reviewer`.
- Don't reuse built-in or bundled names such as `review`, `init`, `run`, `simplify` or `code-review`: a project skill replaces them.
- A personal skill in `~/.claude/skills` silently overrides a project skill with the same name. For agents it's the other way round.

## Installing into a project

Run `bun scripts/install.ts <target> [--dry-run] [--sets core,js,web,react,next,mui,astro,mobile,aws] [--force]` from a clean commit of this repo: the manifest records `HEAD`, and the installer warns about uncommitted changes to the copy set or `.mcp.json`. It has no package script on purpose: one named `install` would run on every `bun install`.

- The target must be a git repository root that isn't skillster, a clone of it or your home folder. That serves a monorepo's packages too: a session started in a package reads the `.claude/` agents, skills and rules and the `.mcp.json` of every folder up to the root, while a session at the root never sees a package's.
- Without `--sets`, a re-install keeps the sets of the last one. A first install refuses without `--sets`, since every set's MCP servers would start in each session, and suggests a value from the project's `package.json` files, workspaces included. A manifest whose sets skillster doesn't know needs `--sets`. `core` is always included, and each set brings the ones it needs: `react` and `mobile` bring `web`, which brings `js`; `next`, `mui` and `astro` bring `react`. Add `react` for React web code outside Next.js and Astro, which reviewer-react reviews; `next` and `astro` bring it themselves. The installer names any set those `package.json` files suggest but the install leaves out: any `package.json` suggests `js`, `react-dom` suggests `react`, `@mui/material` `mui`, `aws-cdk-lib` or an `@aws-sdk/` package `aws`, and `next` and `astro` their own; nothing suggests `mobile`.
- Files are copied, never symlinked, and never written through a symlink: rules reached through a symlink need approval, and the scoped ones don't load at all.
- Nothing is written until every check passes. The installer refuses when a file it would write holds other content and isn't in its manifest, or when an agent, skill or top-level command elsewhere in the target's `.claude/` uses one of our names: duplicate agent names resolve arbitrarily, and a skill hides a command. A file that's already identical is adopted. It warns when `~/.claude/skills` has a skill with one of our names, since that one would win.
- `.claude/skillster-manifest.json` in the target records this repo's commit, the sets, a sha256 per installed file and one per installed MCP server. Re-installing deletes files that are no longer shipped, and refuses to overwrite or delete a locally edited one unless `--force` is given. After an interrupted install, re-run from the same commit with the `--sets` the installer prints: files and servers that landed are adopted, and a file cut off mid-write is refused until you delete it.
- MCP servers go into the target's `.mcp.json`, created if missing, and are tracked like files, by a hash of the parsed entry, so reformatting isn't an edit: an identical entry under our name is adopted, a different one we didn't install is refused, and ours is updated, or removed once no chosen set ships it, unless it has local edits and `--force` isn't given. Only our entries change: other servers, key order, spacing, line endings and a byte order mark stay, new entries follow the shape of the one before them, and the file is replaced in one step, keeping its mode. A `.mcp.json` that's a symlink or isn't plain JSON, comments included, is refused.
- It warns about MCP servers it can't fix: another server that runs the same package or URL under its own name, in the target's `.mcp.json` or a package's own, since sessions then start both; a package `.mcp.json` that defines one of our names differently, which wins in sessions started there; a user- or local-scope server in `~/.claude.json` with one of our names (local scope wins over `.mcp.json`, which wins over user scope); and a chosen server's command (`bunx`, `uvx`, `maestro`) missing from `PATH`. From `~/.claude.json` it reads server names and definitions only, prints nothing but names and never writes it. Files that can't be read only feed warnings, so they don't stop the install, and dependencies committed under `node_modules` don't count.
- Nothing is pre-approved: Claude Code asks each user to approve the new servers at their next session in the project, unless their settings set `enableAllProjectMcpServers`, as approving all servers at that prompt does. Approvals go by name, so an updated definition isn't asked about again; `claude mcp reset-project-choices` brings the prompts back. Each developer needs Bun for `bunx`, Node.js, since the packages bunx starts are Node scripts, Chrome for chrome-devtools, uv for aws-mcp's `uvx`, and the Maestro CLI for maestro, with an Android emulator or device, or an iOS simulator (macOS only), for it to drive.
- aws-mcp sends its requests to `AWS_MCP_ENDPOINT` (eu-central-1 unless set). Its proxy runs with `--read-only`, which hides every tool the AWS MCP Server doesn't mark read-only and rejects calls to them. That leaves the knowledge tools, for AWS documentation, skills and regional availability, and `aws___get_tasks`, which only polls tasks that `aws___run_script` started. `aws___run_script`, which runs Python against AWS APIs, and `aws___get_presigned_url`, which signs Amazon S3 upload and download URLs, aren't marked read-only, so aws-mcp currently can't read or change anything in the account; a tool AWS later adds and marks read-only would get through. AWS answers the knowledge tools without credentials, so the proxy also runs with `--skip-auth`: it sends its requests unsigned when the AWS SDK finds no credentials, and otherwise signs them with the profile in `AWS_PROFILE`, or else with environment variables, the `default` profile or the SDK's other usual sources. Developers need no AWS setup, but credentials the SDK finds and can't load still break it: an `AWS_PROFILE` naming a missing profile stops the proxy at startup, and an expired SSO login fails its `initialize` until `aws sso login`. `AWS_REGION` (eu-west-1 unless set) sets the default region for AWS API calls, so it matters only without `--read-only`. To lift `--read-only` for yourself, add a local-scope server of the same name, which wins over `.mcp.json`: `claude mcp add --scope local aws-mcp -- uvx mcp-proxy-for-aws-cli==1.7.0 <endpoint> --profile <profile> --metadata AWS_REGION=<region>`; it doesn't follow later version bumps, and the installer warns that it overrides ours. For a whole project, drop the `aws` set and define the server in its `.mcp.json`. Either way the profile's IAM permissions are then the real limit, since `aws___run_script` can make any AWS API call they allow; AWS's `aws:ViaAWSMCPService` and `aws:CalledViaAWSMCP` condition keys narrow them for MCP calls only.
- It adds `.claude/` to `.prettierignore` when the target uses Prettier, and warns about a package script whose `--ignore-path` makes Prettier skip `.prettierignore` without keeping it out of `.claude/` some other way. For Biome it prints the `files.includes` entry to add unless the config already excludes `.claude`, as this repo's `biome.jsonc` does, and leaves the config alone.
- `--dry-run` prints the plan, server changes included, and changes nothing. `--help` prints the usage.

## Third-party skills

None at the moment. A vendored skill keeps its upstream name and its files unmodified, so it can be re-pulled; editing one makes it ours, so rename it and drop it from this list.

`best-practices-react` and `best-practices-bun` were forked that way from Vercel Engineering's react-best-practices (MIT); keep the attribution in their files and the `LICENSE.txt` in each folder, since the installer copies them into every project.

## This repo

- Check changes with `bun run format`, then `bun run lint`. Its `lint:claude` leg (`scripts/lint-claude.ts`) checks the copy set: names match folders and files, preloaded skills exist and ship with the agent's set, rule frontmatter parses, every file and MCP server is in exactly one language set, and the server definitions hold up.
- `src/index-before.ts` is a deliberately buggy review sample, excluded from Biome and `tsc`. `src/index-after.ts` is its reviewed version. Never point a reviewer at the before-file.
- Test agents and skills on throwaway copies outside the repo: the reviewers edit what they review.
