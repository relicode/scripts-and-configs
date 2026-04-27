# Bash Configuration

Shell setup is split across four files, each with a single responsibility, plus an overflow directory for long out-of-line scripts.

| File | Purpose |
|---|---|
| `~/.bash_env` | Environment: helpers, env vars, PATH. POSIX-ish, no interactive output. |
| `~/.profile` | Login glue — sources `.bash_env` then `.bashrc`. |
| `~/.bashrc` | Interactive bash: history, prompt, shopt, completion, slow setup scripts. |
| `~/.bash_aliases` | Aliases and small interactive helpers (`mkcd`, etc.). |
| `~/.config/bash/*.sh` | Out-of-line script chunks too long to inline (e.g. `nvm-autocd.sh`), sourced from `.bashrc`. |

## Loading order

**Login shell** (SSH login, terminal from a display manager):
1. Bash sources `~/.profile`
2. `.profile` sources `~/.bash_env` → defines helpers, exports env vars, sets PATH
3. `.profile` exports `BASH_ENV=~/.bash_env` so non-interactive bash also picks it up
4. `.profile` sources `~/.bashrc` → interactive setup
5. `.bashrc` runs `safe_source ~/.bash_aliases`

**Non-login interactive shell** (new terminal tab from an existing graphical session):
- Bash sources `~/.bashrc` only.
- `.bashrc` re-sources `.bash_env` *only if* helpers aren't already inherited from the parent (they normally are, via `export -f`).
- `.bashrc` runs `safe_source ~/.bash_aliases`.

**Non-interactive bash** (scripts, `bash -c '...'`):
- Bash auto-sources `$BASH_ENV` → `~/.bash_env`.
- Helpers, env vars, PATH all available. No prompt, no aliases, no slow setup.

## Helper functions

Both live in `~/.bash_env` and are exported with `export -f`, so any bash subshell inherits them.

### `path_add path1 [path2 ...]`

- Prepends each path to `$PATH`.
- **Idempotent**: skips entries already in `$PATH`, so re-sourcing never duplicates.
- Warns to stdout if a given argument is not a directory.

### `safe_source file1 [file2 ...]`

- Sources each file if it exists.
- Warns if a file is missing — useful for catching typos or partial installs.
- Handles paths with spaces (uses quoted `"$@"`).

## Where to add things

| Adding... | Goes in... |
|---|---|
| An environment variable (`FOO_HOME`, `EDITOR`, etc.) | `~/.bash_env` |
| A `PATH` entry | `~/.bash_env` (`path_add ...`) |
| A tool's home dir that the tool itself reads (e.g. `BUN_INSTALL`, `NVM_DIR`) | `~/.bash_env` |
| A slow init script (`nvm.sh`, `fzf`, etc.) | `~/.bashrc` (interactive cost only) |
| Bash completion | `~/.bashrc` |
| Prompt / `PS1` | `~/.bashrc` |
| `shopt`, history settings | `~/.bashrc` |
| An alias | `~/.bash_aliases` |
| A small interactive helper function | `~/.bash_aliases` |
| A long sourceable script chunk (e.g. `cdnvm`) | `~/.config/bash/<name>.sh`, sourced from `.bashrc` |

## Tool config placement

Prefer XDG paths over dotfiles directly under `$HOME`. New configs go in `$XDG_CONFIG_HOME/<tool>/` (i.e. `~/.config/<tool>/`) — e.g. `~/.config/git/config`, `~/.config/nvm/`. Same logic for state (`$XDG_STATE_HOME`) and cache (`$XDG_CACHE_HOME`). Fall back to a tool's native default (e.g. `~/.cargo`, `~/.bun`) only when the tool doesn't support XDG and the env-var override would be more friction than the win.

## Style conventions

- 2-space indentation, no tabs, no trailing whitespace.
- For variadic calls, use line continuation with backtick-comments per line:

  ```bash
  path_add \
    "$HOME/.local/bin" `# user-local installs (pip --user, pipx)` \
    "$BUN_INSTALL/bin" `# bun`
  ```

  The `` `# ...` `` is command substitution that expands to nothing. It avoids the gotcha where a bare `#` would swallow the trailing `\` and break the continuation.

- When a sourced file needs a runtime command (not just to exist on disk), pair `safe_source` with `command -v`:

  ```bash
  command -v nvm >/dev/null 2>&1 && safe_source "$XDG_CONFIG_HOME/bash/nvm-autocd.sh"
  ```

  The two checks are orthogonal — `safe_source` guards file presence, `command -v` guards a runtime dependency. Keep them as two parts; don't fold the command check into `safe_source`.

## Currently set

### Env vars (in `~/.bash_env`)
| Var | Value |
|---|---|
| `XDG_CONFIG_HOME` | `~/.config` |
| `XDG_DATA_HOME` | `~/.local/share` |
| `XDG_STATE_HOME` | `~/.local/state` |
| `XDG_CACHE_HOME` | `~/.cache` |
| `EDITOR` / `VISUAL` | `nvim` → `vim` → `nano` (first installed wins) |
| `PAGER` | `less` |
| `LESS` | `-FRi --mouse` |
| `BUN_INSTALL` | `~/.bun` |
| `NVM_DIR` | `~/.config/nvm` |
| `BASH_ENV` | `~/.bash_env` (set in `.profile`) |

### PATH (prepended, effective order)
- `~/.cargo/bin`
- `~/.bun/bin`
- `~/.local/bin`

### Interactive options (in `~/.bashrc`)
- History: 100 000 entries, `HISTTIMEFORMAT='%F %T  '`, `HISTIGNORE` for trivial commands, `histappend`, `histverify`.
- shopt: `checkwinsize`, `globstar`, `autocd`, `cdspell`, `dirspell`, `checkjobs`.
- Loaders: `lesspipe`, `dircolors`, bash-completion, `bun completions` (via process substitution).
- nvm: loaded via `safe_source "$NVM_DIR/nvm.sh" "$NVM_DIR/bash_completion"`.
- nvm autocd: `~/.config/bash/nvm-autocd.sh` aliases `cd` to `cdnvm`, which runs `nvm use` based on the nearest `.nvmrc` (or default). Adapted from the upstream nvm README — bootstrap line uses `|| true` instead of upstream's `|| exit` so a transient nvm error can't close the shell.

### Aliases (in `~/.bash_aliases`)
- Color: `ls`, `grep`, `fgrep`, `egrep` → `--color=auto`.
- ls shortcuts: `ll`, `la`, `l`.
- `alert` — desktop notification when a long command finishes.
- `mkcd <dir>` — create and cd into a directory.
- `vim` — runs `~/opt/nvim-linux-x86_64/bin/nvim` via `nvm exec --silent default`, so node-based plugins resolve `node` from nvm's default version.

## Picking up changes

In an existing shell:
```bash
source ~/.profile      # full re-init
```
Or just open a new terminal tab. Both are safe to do repeatedly — the setup is idempotent.

## Sanity check

```bash
# from a clean env, a login shell should produce these:
env -i HOME="$HOME" TERM=xterm-256color PATH=/usr/bin:/bin bash -lic \
  'echo PATH=$PATH; echo XDG_CONFIG_HOME=$XDG_CONFIG_HOME; type path_add safe_source mkcd'
```
