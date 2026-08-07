import test from 'node:test';
import assert from 'node:assert/strict';
import { detectHorizontalSwipe, shouldIgnoreSwipeStart } from '../js/gestures.js';

test('detectHorizontalSwipe returns right direction for a clear right swipe', () => {
  var direction = detectHorizontalSwipe({
    dx: 80,
    dy: 10,
    minDistance: 56,
    minDirectionRatio: 1.35
  });

  assert.equal(direction, 1);
});

test('detectHorizontalSwipe rejects mostly vertical movement', () => {
  var direction = detectHorizontalSwipe({
    dx: 60,
    dy: 70,
    minDistance: 56,
    minDirectionRatio: 1.35
  });

  assert.equal(direction, 0);
});

test('shouldIgnoreSwipeStart detects control targets through closest', () => {
  var target = {
    closest: function (selector) {
      return selector.indexOf('button') >= 0 ? {} : null;
    }
  };

  assert.equal(shouldIgnoreSwipeStart(target), true);
});
