import { expect, test } from 'bun:test'

type Point = { x: number; y: number }

const origin: Point = { x: 0, y: 0 }

test('origin has zero coordinates', () => {
  expect(origin.x).toBe(0)
  expect(origin.y).toBe(0)
})
