# Scripts

A script meant to be run as a command, by path or from `PATH`, in any language:

- Starts with a shebang for its interpreter, such as `#!/bin/sh`. Language rules can name the one to use.
- Is executable (`chmod a+x`, or `git add --chmod=+x` where git ignores file modes), so git records it as mode `100755`.
- Defines its usage text as a `USAGE` constant, cased the way the language cases constants, in its first lines, right after the shebang and imports. On `-h` or `--help` it prints `USAGE` and exits with code 0:

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
