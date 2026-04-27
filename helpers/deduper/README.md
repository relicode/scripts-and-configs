# deduper

Interactive duplicate-file remover. Bun + meow CLI, ink TUI, [fclones](https://github.com/pkolaczk/fclones) as the scan engine.

Pass any number of dirs — the **first dir is treated as priority**, so its copies are kept and duplicates in later dirs are pre-marked for deletion. You confirm in a TUI before anything is removed.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3
- [`fclones`](https://github.com/pkolaczk/fclones) on `PATH` (`cargo install fclones` or your package manager)

## Install / build

```sh
bun install
bun run build       # cross-compiles to ./dist/deduper-{linux,darwin}-{x64,arm64}
```

Each binary embeds the Bun runtime, so end users only need `fclones` on `PATH` — Bun is not required at runtime.

## Usage

Pick the binary for your platform — `dist/deduper-{linux,darwin}-{x64,arm64}` — and invoke it directly. Examples below use `deduper-linux-x64`; substitute as appropriate.

```sh
./dist/deduper-linux-x64 [flags] [-- <fclones args> --] <dir> [more dirs ...]
```

Examples:

```sh
./dist/deduper-linux-x64 ~/Pictures ~/Backup/Pictures
./dist/deduper-linux-x64 -- --min 1M --hidden -- ./a ./b ./c
./dist/deduper-linux-x64 --no-tui ./a ./b              # report-only, no UI, no deletions
./dist/deduper-linux-x64 --no-tui --json ./a ./b       # machine-readable
```

Args bracketed between two `--` tokens are forwarded verbatim to `fclones group`. Omit the brackets entirely if you have no fclones args to pass.

## Flags

| Flag        | Default | Effect                                                     |
| ----------- | ------- | ---------------------------------------------------------- |
| `--no-tui`  | off     | Print the would-delete report and exit. No deletions.      |
| `--json`    | off     | With `--no-tui`, emit JSON instead of human-readable text. |
| `--help`    |         | Show usage.                                                |
| `--version` |         | Show version.                                              |

## TUI keys

| Key       | Action                                                  |
| --------- | ------------------------------------------------------- |
| `↑` / `↓` | Move within group (and across group boundaries)         |
| `←` / `→` | Jump to previous / next group                           |
| `space`   | Toggle deletion mark on the current file                |
| `a`       | Auto-mark current group (drop everything except keeper) |
| `n`       | Clear all marks in current group                        |
| `A` / `N` | Same, applied to every group                            |
| `d` / `⏎` | Confirm and delete marked files                         |
| `q`       | Quit                                                    |

The `KEEP*` marker shows which copy was chosen as the priority keeper.

## How priority works

`priorityScore(path)` is the index of the first dir argument that contains the path. Lower wins. If a duplicate group has no copy in the first dir, the keeper falls back to the next dir.

## Run from source

```sh
bun run src/index.tsx <dir> [more dirs ...]
```
