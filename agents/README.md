# Claude Code agents

Subagent definitions consumed by Claude Code. Each `.md` file is a single agent with YAML frontmatter (`name`, `description`, `model`, `color`) plus the prompt body.

## Install

Symlink each file into `~/.claude/agents/`. Per-file (not the whole directory) so unrelated agents already there are left alone:

```sh
mkdir -p ~/.claude/agents
ln -sfn "$PWD"/agents/*.md ~/.claude/agents/
```

Run from the repo root. Re-run after `git pull` is harmless — `ln -sfn` refreshes the symlinks idempotently. Since these are symlinks, editing a file in `agents/` updates the live agent immediately.

Two caveats worth knowing:

- The glob also symlinks `README.md` into `~/.claude/agents/`. Harmless: Claude Code ignores files without valid agent frontmatter, so it never tries to load the README as an agent.
- If `~/.claude/agents/<name>.md` already exists as a *regular file* (not a symlink), `ln -sfn` silently replaces it with the new symlink. Back it up first if you have hand-edits there you care about.

## Current agents

- `reviewer-b.md` — reviews Bun/TypeScript code (Bun scripts, `scripts/`, `server/`, repo-root TS/TSX/JS).
- `reviewer-f.md` — reviews Flutter/Dart code.
