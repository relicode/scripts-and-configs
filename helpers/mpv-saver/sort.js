#!/usr/bin/env node

const path = require('path')

const dataPath = path.join(process.env.PWD, process.argv[2] || 'saved.json')
const data = require(dataPath)
const toDel = []
const toSave = []

for (const [key, val] of Object.entries(data)) {
  const arr = val ? toSave : toDel
  arr.push(key)
}

const lines = toSave.length ? [`if [ ! -d 'temp' ]; then mkdir temp; fi;`] : []
for (const p of toDel) lines.push(`rm -v '${p}';`)
for (const p of toSave) lines.push(`if [ -d 'temp' ]; then mv -v '${p}' temp; fi;`)
lines.push(`rm -v '${dataPath}';`)

for (const l of lines) console.log(l)
