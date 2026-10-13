# Scripts

A script, in any language, is a file that runs as a program of its own, whether by path, from `PATH`, or through its interpreter or a package script, such as `bun scripts/seed.ts`. CLI entry points are scripts; modules that are only ever imported, git hooks, and the entry point of a server or other long-running service aren't. A script:

- Starts with a shebang for its interpreter, such as `#!/bin/sh`. Language rules can name the one to use.
- Follows its language's rules even without a file extension, such as `bin/deploy`, though their `paths:` won't load them for it: read them yourself. Linters and type-checkers that pick files by extension skip it too, so keep its code in a module they check, or say it went unchecked.
- Is executable (`chmod a+x`, or `git add --chmod=+x` where git ignores file modes), so git records it as mode `100755`.
- Defines its usage text as a `USAGE` constant, cased the way the language cases constants, right after the shebang, imports, type declarations and any constants it interpolates, and before other code. On `-h` or `--help` it prints `USAGE` and exits with code 0:

  ```sh
  #!/bin/sh

  readonly USAGE='Usage: list-todos <folder>

  Lists the TODO comments in the files under <folder>.'

  for arg in "$@"; do
    case "$arg" in
      --) break ;;
      -h | --help)
        printf '%s\n' "$USAGE"
        exit 0
        ;;
    esac
  done
  ```

- Checks for `-h` and `--help` itself, before an argument parser that prints help of its own, such as Python's argparse, gets to them.
- As a wrapper, which passes its arguments on to another command, takes `-h` and `--help` as its own only before the first argument it passes on, so that `with-env git --help` still shows git's help.
