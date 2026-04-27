# mpv-saver

Two-file project: an mpv playback script and a Node.js CLI sorter.

## Files

- `saver.js` — mpv JavaScript script (MuJS / ES5). No const, let, arrow functions, template literals, or any ES6+ features.
- `sort.mjs` — Node.js 24+ CLI tool. Modern ESM, zero external dependencies.

## Constraints

### saver.js
- Must be valid ES5 — mpv uses the MuJS engine
- No `const`, `let`, arrow functions, template literals, destructuring, `for...of`, classes, Promises
- Use `var`, `function` declarations, string concatenation
- Timer API: `setTimeout`/`clearTimeout` (not `mp.add_timeout`)
- OSD colors require ASS overlay (`mp.create_osd_overlay("ass-events")`), not `mp.osd_message`
- ASS colors are BGR format: `\c&HBBGGRR&`

### sort.mjs
- Node.js 24+ with no external dependencies
- Uses `node:util/parseArgs`, `node:readline/promises`, `node:fs/promises`, `node:child_process`
- Follows user's global CLAUDE.md conventions (import, async/await, arrow functions, type over interface)

## saved.json format

```json
{
  "toDel": ["relativePath"],
  "toPlaylist": [[], [], [], [], [], [], [], [], [], []],
  "toSave": ["relativePath"],
  "toCut": [{ "path": "relativePath", "start": 0, "end": 10 }]
}
```

Written to mpv's working directory. Both files read/write this same file.

## Style

- Prefer `undefined` over `null` in saver.js
- No Claude attribution in commits
