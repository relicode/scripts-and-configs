# Subagents

When to hand work to a subagent, and how to keep what it costs in proportion to what it buys. Every request re-reads the session's whole context, so a session costs its context length times its number of turns. A subagent starts over from the system prompt, tools and rules, and re-reads the files it needs, so it pays off when it keeps a long work loop's output out of a session that goes on, and costs extra when it repeats what that session already holds.

- Make a small change yourself, in the main session, with the files you already have in context. Hand a change to a developer agent when it needs a long loop of its own, such as edits across several files with builds and test runs in between.
- **Reviews are user-initiated.** A reviewer agent reads the whole change, the rules and the files around it, so a round costs about what producing the change did. Run one when the user asks for it, or at the points where it's worth that: before a commit that closes a piece of work, before pushing a branch, before opening or merging a pull request. Don't start one after each edit, each file or each developer-agent run.
- A developer agent's report names the reviewer that covers its change. That's information about which one fits, not a request to start it: say the change is ready for review and leave the decision to the user.
- One round per review, not a round after each fix. Check that round's fixes yourself, and run another only when it changed something substantial or the user asks for more.
- Tell a developer agent not to start a reviewer of its own.
- Continue a finished subagent only within minutes of its last turn, while its prompt cache is warm. Once the cache has expired, resuming it writes its whole history to the cache again, which costs more than a fresh start. Start a fresh agent instead, with the earlier one's final report in its brief.
