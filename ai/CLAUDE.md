# ai/

Claude Code rules, skills and agents, kept here as a base to copy into other projects by hand. There is no build, no installer and no package: the files are the deliverable.

## Layout

```
ai/
├── agents/     agents/<name>.md
├── rules/      flat for the core, one subfolder per language
├── skills/     skills/<name>/SKILL.md, plus references/ where a skill has one
├── mcp.json    copied to a project root as .mcp.json
├── CLAUDE.md   this file
└── README.md   what's here and how to copy it
```

`agents/`, `rules/` and `skills/` are copied into a project's `.claude/` as-is, so everything in them has to work in any project:

- Self-contained: no absolute paths, no `~/etc`, no `../`, nothing that assumes this repo. A skill refers to its own files through `${CLAUDE_SKILL_DIR}` or its base directory.
- Real files only, no symlinks: a rule reached through a symlink needs approval, and a scoped one doesn't load at all.
- Flat: the folder name under `skills/` and the file name under `agents/` equal the `name:` in the frontmatter. Rules are grouped by language. No `commands/`.
- No docs, notes, evals or test output inside these folders. skill-creator puts its workspace next to the skill by default; put it outside instead.

## Naming

- **Agents are `{role}-{speciality}`**: `developer-bun`, `reviewer-next`. The speciality is always present, so the catch-all reviewer is `reviewer-generic`, not `reviewer`.
- **Skills are `{verb}-{speciality}`**, with the verb matching the role: `develop-bun` for `developer-bun`, `review-next` for `reviewer-next`.
- **Every agent has its counterpart skill.** A skill may have no agent: the `best-practices-*` reference guides have none.
- Keep an agent thin: a role, a `skills:` list, and which reviewer comes next. Procedures live in the skills, not in agent bodies, so adding a stack means adding its skills first.
- Don't reuse built-in or bundled names such as `review`, `init`, `run`, `simplify` or `code-review`: a project skill replaces them.
- A personal skill in `~/.claude/skills` silently overrides a project skill with the same name. For agents it's the other way round.

## What goes where

Each layer states a thing once and the next one points at it. Keeping that straight is what stops the set from bloating:

- **Rule** — *the standards.* What correct code looks like, stated once. Rules load automatically for files their `paths:` match, so a skill never needs to restate one: it names the rule. Scope a language rule with `paths:`. The built-in Explore and Plan agents skip rules, so restate what they must follow when delegating to them.
- **Skill** — *the procedure.* `develop-generic` and `review-generic` hold the whole procedure: scope, phases, report format, ground rules. A `develop-<stack>` or `review-<stack>` skill extends it with only what that stack adds — which rules are its standards, which `best-practices-*` guide covers it, and how its violations map onto the review categories. If a stack skill is restating a rule, move the text into the rule.
- **Reference** — `best-practices-<language>`, a guide of numbered rules with examples, consulted during the procedure. No agent, no procedure.
- **Agent** — *the role.* A persona, a `skills:` list, and which reviewer covers its output. Nothing a skill could hold.
- **MCP server** — one used by a single agent goes inline in that agent's `mcpServers:`; any other goes in `mcp.json`.

The same rule against restating applies sideways: a `develop-<stack>` and its `review-<stack>` sibling share their standards through the rule, so neither spells out what the other does. The grading scale, the six finding categories and the best-practices formula live in `review-generic` alone, and no stack skill adds a seventh category.

### What a `paths:` glob can and can't scope

A path-scoped rule loads when Claude reads or edits a file the glob matches — not at startup, and not from a path merely named in a prompt. That makes the rule layer reliable for a **language** standard, where the extension *is* the language, and unreliable for a **framework** one, where no glob can say "this file belongs to the Next.js app". Both failure modes are live:

- Too narrow and the rule misses the files it governs. Astro's actions, endpoints and content config are `.ts`, not `.astro`, so an `.astro`-only glob would never load the rule that says an endpoint must authorize its own caller.
- Too wide and it fires where it's wrong. A `**/*.ts` glob on a Next.js rule reaches a Bun-only package in the same monorepo, where it contradicts `js/bun.md`.

So `js/next.md` and `js/astro.md` take the wide glob and open by naming the part of the tree they apply to, and anything whose absence would be a security bug does **not** depend on a glob at all: it is stated framework-neutrally in `review-generic`'s Security category and `develop-generic`, which every agent loads through `skills:` regardless of what it opens. The stack rule then adds the framework's specifics — which prefix inlines a secret, which API redirects — and the stack skill only says which category they land in.

That is also why `develop-generic` and `review-generic` must keep telling the agent to read every applicable rule from disk. Without that instruction an agent that only runs `git diff` holds no rule at all.

## Reviews are user-initiated

A reviewer agent re-reads the change, the rules and the surrounding files, so a round costs about what producing the change did. Nothing in the set may start one by itself:

- No reviewer description says "use proactively". Each one names the moments worth the cost — the user asking, or a commit, push or merge.
- A developer agent's report ends with a `### Review` section whose body is `Not run.` plus the reviewer that covers the change — one per language where it touches several. It names them and stops there.
- `rules/subagents.md` states the policy for the main session. Keep these three in step; the eagerness comes back the moment one of them starts telling the session to review.

## The stacks

Each stack layers on the ones before it, so `developer-next` preloads `develop-bun` and `develop-react` as well as `develop-next`.

| Stack | Rules | Developer | Reviewer | Reference skills | MCP servers |
| --- | --- | --- | --- | --- | --- |
| Generic | `clean-code.md`, `git.md`, `scripts.md`, `shell.md`, `subagents.md` | `developer-generic` | `reviewer-generic` | — | `context7` |
| Bun / TypeScript | `js/typescript.md`, `js/bun.md`, `js/lint-and-format.md` | `developer-bun` | `reviewer-bun` | `best-practices-bun` | — |
| React | `js/react.md` | `developer-react` | `reviewer-react` | `best-practices-react` | `chrome-devtools` |
| Next.js | `js/next.md` | `developer-next` | `reviewer-next` | — | `next-devtools` |
| Astro | `js/astro.md` | `developer-astro` | `reviewer-astro` | — | `astro-docs` |
| MUI | `js/mui.md` | — | — | — | `mui-mcp` |
| Rust | `rust/rust.md`, `rust/lint-and-format.md` | `developer-rust` | `reviewer-rust` | `best-practices-rust` | — |
| AWS | — | — | — | — | `aws-mcp` |
| Mobile browsers | — | — | — | — | `maestro` |

The js rules also cover `.astro` files, whose frontmatter is TypeScript, and `js/lint-and-format.md` covers `.mdx` as well. `js/next.md` and `js/astro.md` carry each framework's standards *and* the extra validation steps a change there needs, the way the `lint-and-format.md` rules do for their toolchains.

## MCP server notes

context7, astro-docs and mui-mcp look up library and framework docs. chrome-devtools drives a headless Chrome with a throwaway profile, and maestro drives mobile browsers on Android emulators and devices and iOS simulators through the Maestro CLI.

A definition here has to hold up on its own: a stdio server needs a command and args and an http one an https URL, every package that bunx, npx or uvx downloads names an exact version, and `env` and `headers` values are `${VAR}` references so secrets stay in the environment. Everything in this file is meant to be copied, so a server you only want for work on this repo goes in local scope instead (`claude mcp add --scope local`). Note that the file is `mcp.json`, not `.mcp.json`: sessions started in this repository don't load it, which is deliberate — it ships, it doesn't run here.

- **next-devtools** reads a running Next.js 16+ dev server. Version 0.4 fetches no docs: its `nextjs_docs` tool only points the agent at the ones Next.js 16.2 and later ship in `node_modules/next/dist/docs/`. Nor does it use Playwright: its `browser_eval` tool only tells the agent how to install and run Vercel's agent-browser CLI, and it can't be switched off short of a permission rule denying `mcp__next-devtools__browser_eval`.
- **aws-mcp** proxies AWS's own MCP server over SigV4, at `AWS_MCP_ENDPOINT` (eu-central-1 unless set). `--read-only` hides every tool AWS doesn't mark read-only, which currently leaves only the knowledge tools for documentation, skills and regional availability — the tools that run Python against AWS APIs or sign S3 URLs aren't marked read-only, so it can't read or change anything in an account. `--skip-auth` lets it send those requests unsigned when the SDK finds no credentials; credentials it finds but can't load still break it, so an `AWS_PROFILE` naming a missing profile stops it at startup and an expired SSO login fails its `initialize` until `aws sso login`. To lift `--read-only` for yourself, add a local-scope server of the same name, which wins over `.mcp.json`: `claude mcp add --scope local aws-mcp -- uvx mcp-proxy-for-aws-cli==1.7.0 <endpoint> --profile <profile> --metadata AWS_REGION=<region>`. The profile's IAM permissions are then the real limit; AWS's `aws:ViaAWSMCPService` and `aws:CalledViaAWSMCP` condition keys narrow them for MCP calls only.

## Third-party skills

`best-practices-bun` and `best-practices-react` are forked from Vercel Engineering's react-best-practices (MIT). Keep the attribution in their files and the `LICENSE.txt` in each folder, since both get copied into every project.

A vendored skill keeps its upstream name and its files unmodified so it can be re-pulled. Editing one makes it ours: rename it and drop it from this list.

## Working here

- Changing an agent's `skills:` means checking that each skill exists and that its description's "preloaded by" list still names the right agents. There's no linter for it any more — grep.
- Before adding text to a stack skill, check whether it's a standard. If it is, it goes in the rule, and the skill gets a pointer. That check is the only thing keeping the stack skills short.
- Test agents and skills on a throwaway copy outside this repo: the reviewers edit what they review.
