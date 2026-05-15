import { expect, test } from 'bun:test'

const square = (n) => n * n

test('square produces n squared', () => {
  expect(square(2)).toBe(4)
  expect(square(5)).toBe(25)
})
