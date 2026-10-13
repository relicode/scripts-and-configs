#!/usr/bin/env bun

'use client'

console.log('before')

await new Promise((res, rej) => {
  console.log('during')
  setTimeout(res, 0)
}, [])

console.log('after')
