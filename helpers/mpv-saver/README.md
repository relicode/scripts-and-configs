# mpv-saver

Tag media files during mpv playback, then batch-process them with a CLI tool.

# ~/.p_B/bin/mpv-saver

```sh
alias mpvv='mpv --script=~/.p_B/bin/mpv-saver/saver.js'
alias mpvs='mpvv --shuffle'
```

## Setup

Copy or symlink `saver.js` into your mpv scripts directory:

```bash
ln -s /path/to/saver.js ~/.config/mpv/scripts/saver.js
```

Or load it manually:

```bash
mpv --script=/path/to/saver.js *
```

Make `sort.mjs` executable:

```bash
chmod +x sort.mjs
```

## Requirements

- mpv (with JavaScript scripting support)
- Node.js 24+
- ffmpeg (for cut processing)

## saver.js - mpv key bindings

| Key   | Action                                                      |
|-------|-------------------------------------------------------------|
| `d`   | Toggle current file for deletion                            |
| `s`   | Toggle current file for saving                              |
| `c`   | Cycle cut: 1st press = start, 2nd = end, 3rd = clear       |
| `0-9` | Toggle current file in playlist 0-9                         |
| `p`   | Toggle play queue display (windowed around current file)    |
| `x`   | Next file (updates queue display if visible)                |
| `z`   | Previous file (updates queue display if visible)            |
| `w`   | Volume down                                                 |
| `e`   | Volume up                                                   |

On file load, the filename and duration are shown briefly.

All tagging actions are saved immediately to `saved.json` in the working directory, so progress survives crashes.

### OSD colors

- Green: added to a list / cut end marked
- Yellow: cut start marked
- Red: removed from a list

## sort.mjs - batch processor

Reads `saved.json` and processes tagged files interactively.

```bash
./sort.mjs                    # process all sections
./sort.mjs -cd                # cuts and deletions only
./sort.mjs -s                 # saves only
./sort.mjs /path/to/saved.json  # custom path
./sort.mjs -h                 # help
```

### Flags

| Flag | Section   |
|------|-----------|
| `-c` | Cut       |
| `-d` | Delete    |
| `-p` | Playlist  |
| `-s` | Save      |

Flags can be combined: `-cdps`. If none given, all sections run.

### Processing order

1. **Cut** - Runs ffmpeg to extract marked sections (no transcoding, stream copy). Output goes to `cuts/` directory.
2. **Save** - Moves files to a named directory (default: `temp/`).
3. **Delete** - Deletes tagged files.
4. **Playlist** - Creates/updates `.m3u` playlist files. Appends to existing playlists without duplicating entries.

Each section lists affected files and prompts for confirmation before acting. Overwrites always prompt individually.

After processing, if `saved.json` is empty it is removed automatically.

## saved.json format

```json
{
  "toDel": ["relative/path/to/file.webm"],
  "toPlaylist": [[], ["file1.webm"], [], [], [], [], [], [], [], []],
  "toSave": ["relative/path/to/file.webm"],
  "toCut": [{ "path": "relative/path.webm", "start": 10.5, "end": 45.2 }]
}
```
