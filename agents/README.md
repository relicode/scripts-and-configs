# skillster

A ready-made Claude Code setup for your projects: house rules, developer and reviewer agents, the skills behind them, and MCP servers for library, framework and AWS docs and for desktop and mobile browsers. One command installs it into a project, and it comes in language sets, so each project gets only what fits its stack.

## Quick start

From `agents/` in a scripts-and-configs checkout, with [Bun](https://bun.com) 1.4 or newer:

```sh
# Preview what would be installed, then install
bun scripts/install.ts ~/code/my-app --sets next --dry-run
bun scripts/install.ts ~/code/my-app --sets next
```

Not sure which sets? Leave out `--sets`: the first install stops and suggests them from the project's `package.json` and `Cargo.toml` files.

Then commit what it wrote in your project, start `claude` there, and approve the MCP servers when it asks.

## What you get

| | What it is | How it's used |
| --- | --- | --- |
| Rules | Coding standards: clean code, scripts, shell commands, TypeScript, Bun, lint and format, React, Rust | Loaded automatically, the language rules only for matching files |
| Agents | Developers that implement a task, and reviewers that review and fix a change | Ask Claude to use one, or @-mention it |
| Skills | The procedures and guides the agents follow | Preloaded by the agents, or run as `/name` |
| MCP servers | Lookups in library, framework and AWS docs, a headless Chrome, mobile browsers through Maestro | Claude calls them when a task needs them |

### Language sets

The core works for any language. Every other set adds a language, framework or platform, and brings the sets it builds on.

| Set | Adds | Builds on |
| --- | --- | --- |
| `core`, always installed | `clean-code`, `scripts` and `shell` rules, `review-generic` and `develop-generic` skills, `reviewer` agent, `context7` server | |
| `js` | TypeScript, Bun and lint-and-format rules, `review-bun` and `best-practices-bun` skills, `dev-bun` and `reviewer-bun` agents | |
| `web` | `chrome-devtools` server | `js` |
| `react` | React rule, `review-react` and `best-practices-react` skills, `reviewer-react` agent | `web` |
| `next` | `dev-next` and `reviewer-next` agents, `next-devtools` server | `react` |
| `mui` | `mui-mcp` server | `react` |
| `astro` | `dev-astro` and `reviewer-astro` agents, `astro-docs` server | `react` |
| `mobile` | `maestro` server, for end-to-end tests on mobile browsers | `web` |
| `aws` | `aws-mcp` server | |
| `rust` | Rust and lint-and-format rules, `review-rust` and `best-practices-rust` skills, `dev-rust` and `reviewer-rust` agents | |

So `--sets next` installs core, js, web, react and next. For React web code outside Next.js and Astro, use `react` instead.

## Installing

### Requirements

- Bun 1.4 or newer, and git. The target must be the root of a git repository. In a monorepo, install at the root: sessions started in a package pick it up from there.
- Each developer on the project needs what its MCP servers run on. `context7` and `astro-docs` are hosted and need nothing; the others need:
  - `chrome-devtools`: Bun, Node.js and Chrome
  - `next-devtools` and `mui-mcp`: Bun and Node.js
  - `aws-mcp`: [uv](https://docs.astral.sh/uv/)
  - `maestro`: the [Maestro CLI](https://maestro.dev), and an Android emulator or device, or an iOS simulator (macOS only), for it to drive

  They need Node.js because `bunx` starts their packages as Node scripts. The installer warns when a server's command (`bunx`, `uvx` or `maestro`) isn't on your `PATH`.

### Choosing sets

`--sets` takes a comma-separated list, such as `--sets next,mui,aws`. Name the sets you want and the ones they build on come along.

A first install needs `--sets`: installing every set would start all of their MCP servers in every session. Without it, the installer stops and suggests sets from the project's `package.json` and `Cargo.toml` files, workspaces included:

```text
$ bun scripts/install.ts ~/code/my-app
Refusing to install; nothing was changed:
  a first install needs --sets, since each set's MCP servers start in every session; the project's package.json files suggest --sets core,js,web,react,next
```

Nothing the installer reads shows that a project tests on mobile browsers, so add `mobile` yourself.

### What it writes

```text
my-app/
├── .claude/
│   ├── agents/                   dev-next.md, reviewer-next.md, …
│   ├── rules/                    clean-code.md, js/typescript.md, …
│   ├── skills/                   review-generic/, best-practices-react/, …
│   └── skillster-manifest.json   what was installed, and from which skillster commit
└── .mcp.json                     our servers added, yours left as they are
```

If the project uses Prettier, `.claude/` also goes into its `.prettierignore`. If it uses Biome, the installer prints the `files.includes` entry that keeps Biome out of `.claude/`, for you to add.

The installer is careful with your files:

- Nothing is written until every check passes, and `--dry-run` shows the plan without changing anything.
- It only changes what it installed, so your own rules, skills and agents can sit next to its files under other names.
- It refuses to overwrite files and MCP servers it didn't install, and stops when one of your agents, skills or commands already uses one of its names.
- It warns about what it can't fix, such as a personal skill in `~/.claude/skills` with one of its names, which would win over the project's, or an MCP server of the same name in your `~/.claude.json`.

### After installing

1. Look over what it wrote (`.claude/`, `.mcp.json`, and `.prettierignore` if it changed) and commit to include it in the repository.
2. Start `claude` in the project. It asks each developer once to approve the new MCP servers.
3. Run `/mcp` to check that the servers connect.

### Updating and changing sets

- **Update:** update your scripts-and-configs checkout and run the install again. Without `--sets`, it keeps the sets of the last install, updates what changed and deletes what's no longer shipped.
- **Change sets:** run it again with `--sets` naming every set you want, since the list replaces the last one rather than adding to it. On a `next` install, `--sets next,mui` adds MUI, while `--sets mui` would drop `next`, removing `dev-next`, `reviewer-next` and `next-devtools`. Check with `--dry-run` first.
- **Local edits:** a re-install refuses to overwrite or delete a file or MCP server entry you edited. Save your change elsewhere, then run it with `--force`.
- **Uninstall:** there's no command for it. Delete the files that `.claude/skillster-manifest.json` lists, whose paths are relative to `.claude/`, and the MCP servers it lists from `.mcp.json`, then the manifest itself.

Run the installer from a clean commit of skillster: the manifest records the commit, and the installer warns about uncommitted changes to what it ships.

## Using it

Everything works in an ordinary `claude` session in your project.

### Rules

Nothing to do. `clean-code.md`, `scripts.md` and `shell.md` load in every session, and the language rules load when Claude works on matching files, such as `*.ts` or `package.json`. Claude follows them when it writes code, and the agents check work against them. `/context` lists the rule files a session loaded at startup.

### Agents

The dev agents implement a task, run the project's checks (format, lint, type-check and tests) and name the reviewer to run next. The reviewers review a change, fix what they find, run the checks and report. Each agent is named for its role and stack, so `dev-next` hands its changes to `reviewer-next`:

| Stack | Set | Implements | Reviews |
| --- | --- | --- | --- |
| Code no other reviewer covers, in any language | core | | `reviewer` |
| TypeScript and JavaScript: scripts, CLIs, Ink UIs, `Bun.serve` servers, libraries, `bun test` suites | js | `dev-bun` | `reviewer-bun` |
| React web code outside Next.js and Astro: single-page apps, component libraries | react | `dev-bun` | `reviewer-react` |
| Next.js: App Router, server and client components, route handlers, server actions | next | `dev-next` | `reviewer-next` |
| Astro: components, content collections, islands, SSR adapters | astro | `dev-astro` | `reviewer-astro` |
| Rust: libraries, command-line tools, async services | rust | `dev-rust` | `reviewer-rust` |

Ask for one by name and Claude delegates to it. To make sure it runs, @-mention it: type `@` and pick it from the list, or type `@agent-` and its name.

```text
Use dev-bun to add a --json flag to scripts/report.ts that prints the report as JSON.
```

```text
Use dev-next to add an /api/health route that returns the app version, then have reviewer-next review the change.
```

```text
@agent-reviewer-bun review my uncommitted changes
```

```text
@agent-reviewer-react review the search box I just added to packages/ui/src/product-list.tsx. The list re-renders on every keystroke.
```

The reviewers' descriptions also tell Claude to run one by itself after it finishes a chunk of code.

Good to know:

- Agents run in the background while you keep working, and `/tasks` lists them. They edit files, so run one at a time on the same files, and don't edit those files yourself while it runs.
- Tell them about deliberate exceptions to the rules, such as "keep returning null here, the API client expects it". Otherwise a reviewer may "fix" it.
- With no files named, a reviewer reviews your uncommitted changes and the commits your branch adds. It fixes problems in what the change added or modified, and lists older ones for you to decide on.
- They leave committing to you: look over the diff and commit it yourself.
- For a report-only review of a pull request, use Claude Code's bundled `/code-review` skill instead.

### Skills

The agents preload the skills they need. You can also run one in your own session: start your message with its name as a slash command, followed by what you want.

| Skill | Set | Run it to |
| --- | --- | --- |
| `/review-generic` | core | Review and fix your uncommitted changes, or the files you name, in this session |
| `/develop-generic` | core | Implement a change the way the dev agents do |
| `/best-practices-bun` | js | Check TypeScript for async waterfalls, caching and hot-path costs |
| `/best-practices-react` | react | Check React and Next.js code against 28 performance rules |
| `/best-practices-rust` | rust | Check Rust for blocking async code, unbuffered I/O, needless allocations and hot-path costs |

`review-bun`, `review-react` and `review-rust` add TypeScript, React and Rust checks to `review-generic`. They're meant for the reviewer agents rather than for running alone.

```text
/review-generic
```

```text
/best-practices-react app/dashboard/page.tsx takes four seconds to load. Find the waterfalls and the bundle bloat.
```

```text
/develop-generic Add retries with exponential backoff to fetchJson in src/http.ts.
```

Claude also loads a skill by itself when a request matches its description, so asking it to make a React page load faster can bring in `best-practices-react`.

### MCP servers

Claude uses them when a task calls for it, and naming one in your prompt steers it there:

| Server | Set | Try |
| --- | --- | --- |
| `context7` | core | "Use context7 to check how zod 4 does discriminated unions." |
| `chrome-devtools` | web | "Open http://localhost:3000/checkout with chrome-devtools and list the console errors and failed requests." |
| `next-devtools` | next | "Use next-devtools to show the errors in the running dev server." |
| `mui-mcp` | mui | "Look up the DataGrid column props with mui-mcp." |
| `astro-docs` | astro | "Search astro-docs for how content collection loaders work." |
| `maestro` | mobile | "Use maestro to open the staging site in Chrome on the Android emulator and walk through sign-in." |
| `aws-mcp` | aws | "Ask aws-mcp which IAM permissions a Lambda function needs to read from an SQS queue." |

`next-devtools` reads a running dev server only on Next.js 16 or newer; its docs lookups need no dev server.

`aws-mcp` runs with `--read-only`, which hides every tool AWS doesn't mark read-only: the ones that run scripts against AWS APIs or sign Amazon S3 URLs aren't, so `aws-mcp` currently can't read or change anything in your account. That leaves its tools for AWS documentation, skills and regional availability, which AWS answers without credentials, so `aws-mcp` needs no AWS setup: it sends its requests unsigned when the AWS SDK finds no credentials, and otherwise signs them with the profile in `AWS_PROFILE`, or else with environment variables, the `default` profile or the SDK's other usual sources. Credentials it finds but can't load still break it: an `AWS_PROFILE` naming a missing profile stops it from starting, and an expired SSO login stops it from connecting until you run `aws sso login`. [`CLAUDE.md`](CLAUDE.md) explains how to lift `--read-only` for yourself.

## Working on skillster

```sh
bun install
bun run format
bun run lint    # Biome, tsc, and lint:claude, which checks the copy set and .mcp.json
```

[`CLAUDE.md`](CLAUDE.md) is the reference for skillster: what ships, where a new rule, skill, agent or MCP server goes, how `scripts/copy-set.ts` wires them into sets, and the installer's behavior in detail. Test agents and skills on throwaway copies outside the repo, since the reviewers edit what they review.

## Credits

`best-practices-bun` and `best-practices-react` are forked from Vercel Engineering's react-best-practices (MIT); each keeps its `LICENSE.txt`.
