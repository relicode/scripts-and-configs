#!/usr/bin/env node

const path = require('path')

const dataPath = path.join(process.env.PWD, process.argv[2] || 'saved.json')
const data = require(dataPath)
const toDel = []
const toSave = []
const toPlaylist = []

const FILE_SAVE = 'save'
const FILE_DELETE = 'delete'
const FILE_PLAYLIST = 'playlist'

const listMapping = {
  [FILE_SAVE]: toSave,
  [FILE_DELETE]: toDel,
  [FILE_PLAYLIST]: toPlaylist,
}

for (const [file, action] of Object.entries(data)) listMapping[action].push(file)

const lines = toSave.length ? [`if [ ! -d 'temp' ]; then mkdir temp; fi;`] : []
for (const p of toDel) lines.push(`rm -v '${p}';`)
for (const p of toSave) lines.push(`if [ -d 'temp' ]; then mv -v '${p}' temp; fi;`)
for (const p of toPlaylist) lines.push(`echo '${p}' >> playlist.m3u;`)
lines.push(`rm -v '${dataPath}';`)

for (const l of lines) console.log(l)
