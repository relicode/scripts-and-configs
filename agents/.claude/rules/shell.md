# Shell commands

How to chain shell commands, in scripts, package scripts, CI steps and the commands you run yourself. A chain reports one exit status, so make it the status of the step that matters, and judge whether a command worked by that status, not by how its output looks.

- A list, subshell or group (`a; b`, `(a; b)`, `{ a; b; }`) exits with its last command's status, so `(build; echo done) && echo ok || echo failed` prints `ok` when the build fails. Chain steps that depend on each other with `&&`, so the first failure stops the chain and becomes its status, and don't end the chain with `|| echo failed`, which makes it exit 0.
- A pipeline exits with its last command's status, so `make test 2>&1 | tail -20` exits 0 when the tests fail. Put `set -o pipefail` before it in the same shell, or, where the shell lacks it, write the output to a file and check the command's own status before reading the file.
