import { test, expect } from 'bun:test';
import { uuidv4 } from '../lib/uuid';

const V4_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('uuidv4 matches v4 shape', () => {
  const id = uuidv4();
  expect(id).toMatch(V4_SHAPE);
});

test('uuidv4 returns unique values', () => {
  const a = uuidv4();
  const b = uuidv4();
  expect(a).not.toBe(b);
});
