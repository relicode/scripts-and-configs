#!/usr/bin/env bun

console.log('before')

console.log('during')
await Bun.sleep(0)

console.log('after')
