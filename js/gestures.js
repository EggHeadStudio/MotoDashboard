export function shouldIgnoreSwipeStart(target) {
  if (!target || typeof target.closest !== 'function') {
    return false;
  }

  return !!target.closest('button, a, input, select, textarea, [role="button"], #start-overlay, #gps-error-overlay, #controls-row, .hud-btn, #history-list, #history-actions');
}

export function detectHorizontalSwipe(input) {
  var dx = Number(input.dx);
  var dy = Number(input.dy);
  var minDistance = Number(input.minDistance);
  var minDirectionRatio = Number(input.minDirectionRatio);

  if (!isFinite(dx) || !isFinite(dy)) {
    return 0;
  }

  var absX = Math.abs(dx);
  var absY = Math.abs(dy);
  var distanceThreshold = isFinite(minDistance) && minDistance > 0 ? minDistance : 56;
  var directionRatio = isFinite(minDirectionRatio) && minDirectionRatio > 1 ? minDirectionRatio : 1.35;

  if (absX < distanceThreshold) {
    return 0;
  }

  if (absY > 0 && (absX / absY) < directionRatio) {
    return 0;
  }

  return dx > 0 ? 1 : -1;
}

export function bindThemeSwipe(input) {
  var mapElement = input.mapElement;
  var onSwipe = input.onSwipe;
  var canStart = typeof input.canStart === 'function' ? input.canStart : function () { return true; };
  var minDistance = Number(input.minDistance);
  var minDirectionRatio = Number(input.minDirectionRatio);

  if (!mapElement || typeof mapElement.addEventListener !== 'function' || typeof onSwipe !== 'function') {
    return function () {};
  }

  var state = {
    active: false,
    consumed: false,
    startX: 0,
    startY: 0
  };

  function resetState() {
    state.active = false;
    state.consumed = false;
  }

  function handleTouchStart(event) {
    if (!canStart()) {
      resetState();
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      resetState();
      return;
    }

    if (shouldIgnoreSwipeStart(event.target)) {
      resetState();
      return;
    }

    state.active = true;
    state.consumed = false;
    state.startX = event.touches[0].clientX;
    state.startY = event.touches[0].clientY;
  }

  function handleTouchMove(event) {
    if (!state.active || state.consumed) {
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      resetState();
      return;
    }

    var dx = event.touches[0].clientX - state.startX;
    var dy = event.touches[0].clientY - state.startY;
    var direction = detectHorizontalSwipe({
      dx: dx,
      dy: dy,
      minDistance: minDistance,
      minDirectionRatio: minDirectionRatio
    });

    if (!direction) {
      return;
    }

    state.consumed = true;
    onSwipe(direction);
  }

  function handleTouchEnd() {
    resetState();
  }

  mapElement.addEventListener('touchstart', handleTouchStart, { passive: true });
  mapElement.addEventListener('touchmove', handleTouchMove, { passive: true });
  mapElement.addEventListener('touchend', handleTouchEnd, { passive: true });
  mapElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return function unbindThemeSwipe() {
    mapElement.removeEventListener('touchstart', handleTouchStart);
    mapElement.removeEventListener('touchmove', handleTouchMove);
    mapElement.removeEventListener('touchend', handleTouchEnd);
    mapElement.removeEventListener('touchcancel', handleTouchEnd);
  };
}
