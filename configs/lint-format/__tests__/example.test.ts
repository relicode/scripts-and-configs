import { expect, test } from 'bun:test'

const greet = (name: string): string => `hello, ${name}`

test('greet returns greeting', () => {
  expect(greet('world')).toBe('hello, world')
})
