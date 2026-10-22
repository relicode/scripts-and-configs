# Subagents

When to hand work to a subagent, and how to keep what it costs in proportion to what it buys. Every request re-reads the session's whole context, so a session costs its context length times its number of turns. A subagent starts over from the system prompt, tools and rules, and re-reads the files it needs, so it pays off when it keeps a long work loop's output out of a session that goes on, and costs extra when it repeats what that session already holds.

- Make a small change yourself, in the main session, with the files you already have in context. Hand a change to a dev agent when it needs a long loop of its own, such as edits across several files with builds and test runs in between.
- Review a change once it is finished, in one reviewer round, not a round after each fix. Check that round's fixes yourself, and run another round only when it changed something substantial or the user asks for more.
- Tell a dev agent not to start a reviewer of its own: the main session runs the review.
- Continue a finished subagent only within minutes of its last turn, while its prompt cache is warm. Once the cache has expired, resuming it writes its whole history to the cache again, which costs more than a fresh start. Start a fresh agent instead, with the earlier one's final report in its brief.
