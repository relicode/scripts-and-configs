# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Personal dotfiles + scripts, checked out at `~/etc/scripts-and-configs`. It is *not* a deployable application — it is the source of truth for files that live elsewhere on the host (mostly `$HOME`). Most subdirectories are independent; there is no shared build.

`bin/common` and `bin/linux` are prepended to `$PATH` by `configs/common-env`, so any executable added there is immediately callable by name.

## Layout (the parts that aren't obvious)

- `configs/` — **template files**, not symlinked. Each file has a `# Place at: ~/.foo` header naming the destination. Editing here does not change the live shell until the file is copied (or symlinked) into place. `BASH_CONFIG.md` is the canonical doc for the shell setup and explains *why* the four-file split exists — read it before editing `bash-env`/`bash-rc`/`bash-aliases`/`profile` or `nvm-autocd`.
- `bin/common/` and `bin/linux/` — scripts on `$PATH`. `linux/` holds Linux-only scripts (e.g. shadowing system `cal`); cross-platform stuff goes in `common/`.
- `helpers/` — small multi-file projects with their own toolchains (`deduper` is a Bun + Ink/React TUI that wraps `fclones`; `mpv-saver` is a two-runtime project; `letsencrypt` is a wrapper around certbot). Treat each as its own project.
- `submodules/` — vendored upstreams (`oh-my-tmux`, `ufw-docker`, `mpv-cut`). Don't edit; update with the submodule command below.

## Common commands

```sh
# Clone (this repo uses submodules)
git clone --recurse-submodules -j8 git@github.com:relicode/scripts-and-configs.git

# Pull + bring submodules forward to their tracked branches
git pull --rebase && git submodule update --remote --merge

# deduper (Bun + Ink/React, single-file binary build)
cd helpers/deduper
bun install
bun run start    # run from source
bun run build    # cross-compile to dist/deduper-{linux,darwin}-{x64,arm64}
bun run lint     # eslint + prettier + tsc --noEmit

# mpv-saver sort.mjs — runs directly, requires Node 24+
./helpers/mpv-saver/sort.mjs -h
```

## Shell-config conventions

Spelled out in `configs/BASH_CONFIG.md`. The load-bearing rules:

- New env vars / `PATH` entries → `bash-env` (sourced by `.profile` *and* by non-interactive bash via `BASH_ENV`, so subshells inherit them). Anything with interactive cost (prompts, completions, `nvm.sh`) → `bash-rc`. Aliases → `bash-aliases`.
- Use the `path_add` and `safe_source` helpers — both are idempotent and exported via `export -f` so subshells inherit them. `path_add` skips entries already on `$PATH`; re-sourcing is safe.
- For files that need a *runtime* tool (not just to exist), pair `safe_source` with `command -v`. Don't fold the command check into `safe_source` — the two checks are orthogonal (file presence vs. runtime dep).
- Style: 2-space indent, no tabs, no trailing whitespace. For variadic calls, use line continuations with `` `# comment` `` (backtick command substitution that expands to nothing) — a bare `#` would swallow the trailing `\` and break the continuation.

## mpv-saver — read its CLAUDE.md before editing

`helpers/mpv-saver/CLAUDE.md` documents hard constraints that are *not* obvious from looking at the code:

- `saver.js` runs in mpv's MuJS engine and must be **valid ES5** — no `const`/`let`, arrow functions, template literals, destructuring, classes, Promises, or `for...of`. Use `var`, `function` declarations, string concatenation. Timer API is `setTimeout`/`clearTimeout`, not `mp.add_timeout`. OSD colors require an ASS overlay with BGR colors (`\c&HBBGGRR&`).
- `sort.mjs` is Node 24+, ESM, **zero external dependencies** — uses `node:util/parseArgs`, `node:readline/promises`, etc. Keep it dependency-free.
- Both files share `saved.json` in mpv's working directory.
