# ai/

A base Claude Code setup to copy into a project: house rules, developer and reviewer agents, the skills behind them, and MCP servers for library, framework and AWS docs and for desktop and mobile browsers.

No installer — copy what fits the project's stack.

## Copying it in

```sh
AI=~/etc/scripts-and-configs/ai
cd ~/code/my-app

mkdir -p .claude
cp -r "$AI"/rules .claude/
cp -r "$AI"/skills .claude/
cp -r "$AI"/agents .claude/
cp -n "$AI"/mcp.json .mcp.json     # or merge by hand into an existing one
```

Then drop what the project doesn't need — see the table below — commit, start `claude`, and approve the MCP servers when it asks. Run `/mcp` to check they connect.

In a monorepo, copy to the repository root. A session started in a package reads the `.claude/` rules, skills and agents and the `.mcp.json` of every folder from that package up to the root, so the root's copy reaches every package — while a copy inside one package is invisible to a session started at the root or in a sibling.

Keep `.claude/` out of the project's formatter: add it to `.prettierignore`, or to Biome's `files.includes` as `!**/.claude`.

### What to keep for which stack

Each stack builds on the ones above it in the table, so a Next.js project keeps the generic, Bun, React and Next.js rows.

| Stack | Rules | Agents | Skills | MCP servers |
| --- | --- | --- | --- | --- |
| Generic — always | `clean-code.md`, `git.md`, `scripts.md`, `shell.md`, `subagents.md` | `developer-generic`, `reviewer-generic` | `develop-generic`, `review-generic` | `context7` |
| Bun / TypeScript | `js/typescript.md`, `js/bun.md`, `js/lint-and-format.md` | `developer-bun`, `reviewer-bun` | `develop-bun`, `review-bun`, `best-practices-bun` | — |
| React | `js/react.md` | `developer-react`, `reviewer-react` | `develop-react`, `review-react`, `best-practices-react` | `chrome-devtools` |
| Next.js | `js/next.md` | `developer-next`, `reviewer-next` | `develop-next`, `review-next` | `next-devtools` |
| Astro | `js/astro.md` | `developer-astro`, `reviewer-astro` | `develop-astro`, `review-astro` | `astro-docs` |
| MUI | `js/mui.md` | — | — | `mui-mcp` |
| Rust — independent | `rust/rust.md`, `rust/lint-and-format.md` | `developer-rust`, `reviewer-rust` | `develop-rust`, `review-rust`, `best-practices-rust` | — |
| AWS — independent | — | — | — | `aws-mcp` |
| Mobile browsers | — | — | — | `maestro` |

Leaving extra rows in mostly costs context, except for MCP servers: every one in `.mcp.json` starts in every session, so delete the ones the project won't use.

### What each developer needs

`context7` and `astro-docs` are hosted and need nothing. The others need Bun (for `bunx`) and Node.js, since the packages `bunx` starts are Node scripts, plus:

- `chrome-devtools`: Chrome
- `aws-mcp`: [uv](https://docs.astral.sh/uv/), for `uvx`
- `maestro`: the [Maestro CLI](https://maestro.dev), and an Android emulator or device, or an iOS simulator (macOS only), for it to drive

## Using it

### Rules

Nothing to do. `clean-code.md`, `git.md`, `scripts.md`, `shell.md` and `subagents.md` load in every session; the language rules load when Claude works on matching files. `/context` lists what a session loaded.

The rules are where the standards live — the agents and skills point at them instead of carrying their own copies, so editing a rule changes what both the developers and the reviewers hold you to.

### Agents

Developers implement a task and run the project's checks. Reviewers review a change, fix what they find, run the checks and report. Each agent is `{role}-{speciality}`, so the pairs line up:

| Code | Developer | Reviewer |
| --- | --- | --- |
| Anything no other agent covers: shell scripts, Python, SQL, Dockerfiles, CI configuration | `developer-generic` | `reviewer-generic` |
| TypeScript: scripts, CLIs, Ink UIs, `Bun.serve` servers, libraries, `bun test` suites | `developer-bun` | `reviewer-bun` |
| React web code outside Next.js and Astro: single-page apps, component libraries | `developer-react` | `reviewer-react` |
| Next.js: App Router, server and client components, route handlers, server actions | `developer-next` | `reviewer-next` |
| Astro: components, content collections, islands, SSR adapters | `developer-astro` | `reviewer-astro` |
| Rust: libraries, command-line tools, async services | `developer-rust` | `reviewer-rust` |

Ask for one by name and Claude delegates to it. To make sure it runs, @-mention it: type `@` and pick it from the list, or type `@agent-` and its name.

```text
Use developer-bun to add a --json flag to scripts/report.ts that prints the report as JSON.
```

```text
Use developer-next to add an /api/health route that returns the app version, then have reviewer-next review the change.
```

```text
@agent-reviewer-react review the search box I just added to packages/ui/src/product-list.tsx. The list re-renders on every keystroke.
```

**Reviews happen when you ask for one.** A reviewer re-reads the change, the rules and the files around it, so a round costs roughly what producing the change did — too much to spend after every edit. None of the agents starts one by itself: a developer finishes with a `### Review` section reading "Not run" plus the name of the reviewer that covers its change, and it's yours to run when the work is worth it, typically before a commit that closes a piece of work, before pushing a branch, or before opening or merging a pull request.

```text
@agent-reviewer-bun review my uncommitted changes
```

Good to know:

- They edit files, so run one at a time on the same files, and don't edit those files while one runs. `/tasks` lists them.
- Tell them about deliberate exceptions, such as "keep returning null here, the API client expects it". Otherwise a reviewer may "fix" it.
- With no files named, a reviewer reviews your uncommitted changes and the commits your branch adds. It fixes what the change got wrong and lists older problems for you to decide on.
- They leave committing to you.
- For a report-only review of a pull request, use the bundled `/code-review` instead.

### Skills

The agents preload what they need. You can also run one yourself as a slash command:

| Skill | Run it to |
| --- | --- |
| `/review-generic` | Review and fix your uncommitted changes, or the files you name |
| `/develop-generic` | Implement a change the way the developer agents do |
| `/best-practices-bun` | Check TypeScript for async waterfalls, caching and hot-path costs |
| `/best-practices-react` | Check React and Next.js code against 28 performance rules |
| `/best-practices-rust` | Check Rust for blocking async code, unbuffered I/O and needless allocations |

```text
/best-practices-react app/dashboard/page.tsx takes four seconds to load. Find the waterfalls and the bundle bloat.
```

The `develop-<stack>` and `review-<stack>` skills extend the generic ones with one stack's specifics. They're written for their agents rather than for running alone.

### MCP servers

Claude reaches for them when a task calls for it, and naming one steers it there:

| Server | Try |
| --- | --- |
| `context7` | "Use context7 to check how zod 4 does discriminated unions." |
| `chrome-devtools` | "Open http://localhost:3000/checkout with chrome-devtools and list the console errors and failed requests." |
| `next-devtools` | "Use next-devtools to show the errors in the running dev server." |
| `mui-mcp` | "Look up the DataGrid column props with mui-mcp." |
| `astro-docs` | "Search astro-docs for how content collection loaders work." |
| `maestro` | "Use maestro to open the staging site in Chrome on the Android emulator and walk through sign-in." |
| `aws-mcp` | "Ask aws-mcp which IAM permissions a Lambda function needs to read from an SQS queue." |

`next-devtools` reads a running dev server only on Next.js 16 or newer. `aws-mcp` runs read-only and currently reaches only AWS's documentation, skills and regional-availability tools, which need no AWS credentials — see [`CLAUDE.md`](CLAUDE.md) for the details and how to lift it.

## Changing it

[`CLAUDE.md`](CLAUDE.md) holds the conventions: the `{role}-{speciality}` naming, the agent-to-skill pairing, what belongs in a rule versus a skill versus an agent, and the MCP server caveats. Test changes on a throwaway copy outside this repo — the reviewers edit what they review.

## Credits

`best-practices-bun` and `best-practices-react` are forked from Vercel Engineering's react-best-practices (MIT); each keeps its `LICENSE.txt`.
