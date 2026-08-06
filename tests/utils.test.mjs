import test from 'node:test';
import assert from 'node:assert/strict';
import { getRotationDeltaFromDrag } from '../js/utils.js';

test('returns a positive rotation delta for rightward drag', () => {
  assert.equal(getRotationDeltaFromDrag(12, 3), 3);
});

test('returns a negative rotation delta for leftward drag', () => {
  assert.equal(getRotationDeltaFromDrag(-8, 2), -2);
});

test('uses the horizontal movement as the primary rotation signal', () => {
  assert.equal(getRotationDeltaFromDrag(20, -10), 5);
});
