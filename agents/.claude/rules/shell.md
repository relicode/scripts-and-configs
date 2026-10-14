# Shell commands

How to chain shell commands and pick out processes, in scripts, package scripts, CI steps and the commands you run yourself.

## Exit statuses

A chain reports one exit status, so make it the status of the step that matters, and judge whether a command worked by that status, not by how its output looks.

- A list, subshell or group (`a; b`, `(a; b)`, `{ a; b; }`) exits with its last command's status, so `(build; echo done) && echo ok || echo failed` prints `ok` when the build fails. Chain steps that depend on each other with `&&`, so the first failure stops the chain and becomes its status, and don't end the chain with `|| echo failed`, which makes it exit 0.
- A pipeline exits with its last command's status, so `make test 2>&1 | tail -20` exits 0 when the tests fail. Put `set -o pipefail` before it in the same shell, or, where the shell lacks it, write the output to a file and check the command's own status before reading the file.
- `set -e` is no substitute for `&&`: the shell ignores it in anything that runs as an `if` or `while` condition or as part of `&&`, `||` or `!`, functions and subshells included, so `(set -e; false; echo reached) || echo failed` prints `reached` and never `failed`. A tool that runs your command in such a context turns it off without a word.

## Processes

- `pgrep -f` and `pkill -f` match a pattern against the full command line of every process, and the shell running your command is one of them: its command line holds your whole command, pattern included. So `pgrep -f <path>` finds a match even when nothing uses the path, and `pkill -f 'next dev'` kills your own shell along with every other job that mentions the text, such as another session's dev server. Never kill by pattern or by name (`pkill -f`, `killall node`, `kill $(pgrep -f …)`).
- Stop a process gently: a plain `kill` (SIGTERM) first, then wait for it to exit, and `kill -9` only if it doesn't, since SIGKILL leaves it no chance to clean up. Stop one you started by the PID you kept (`$!` right after starting it in the background), and one with children by its process group (start it with `setsid`, then `kill -- -<pid>`). Check that the PID is still the one doing the work: a launcher can hand off to a new process and exit, as headless Chrome's does, so find that process by something it holds, such as `lsof -t +D <its folder>`.
- To find a process you didn't start, list the candidates with `pgrep -af <pattern>`, narrowed where you can (`-x` for an exact process name, `-u "$USER"`, `-P <parent pid>`), and expect your own shell among them. Writing one character as a bracket class, as in `'[n]ext dev'`, keeps the pattern from matching itself, as long as the plain text appears nowhere else in the command. Check that each match is the process you mean, then kill those PIDs by number.
