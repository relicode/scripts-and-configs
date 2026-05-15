import { expect, test } from 'bun:test'

test('boolean truthiness', () => {
  expect(Boolean('x')).toBe(true)
  expect(Boolean('')).toBe(false)
})
