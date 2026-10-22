# Git

Applies to every session and every agent, since nothing here is scoped to a file type.

## No Claude attribution

Never sign work as Claude. That means no `Co-Authored-By:` line naming Claude or a model, no "Generated with Claude Code" footer, and no equivalent trailer, badge or note in a commit message, a pull request or issue description, a changelog entry, a code comment or a document. It holds whoever asked and however the work was produced: the commit is the user's, under their name alone.

## Committing is the user's call

- Don't commit, amend or push unless the user asks for it in this session. Finish the work, say what changed, and leave the commit to them. Approval for one commit isn't approval for the next.
- Never force-push, rewrite published history, or `git add -A` a tree you haven't looked at.
- A commit the user does ask for follows the repository's own conventions. Read `git log` first for the subject's mood, case and length and for whether messages carry a body or a prefix, and match what's there rather than importing a convention from elsewhere.
- Leave unrelated changes out of a commit the user asked for, and say what you left.
