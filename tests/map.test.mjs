import test from 'node:test';
import assert from 'node:assert/strict';
import { setFollowMapView } from '../js/map.js';

test('setFollowMapView applies initial zoom-up behavior', () => {
  var calledSetView = false;
  var map = {
    getZoom: function () { return 10; },
    setView: function () { calledSetView = true; },
    getCenter: function () { return null; },
    distance: function () { return 100; },
    panTo: function () {}
  };

  var hasApplied = setFollowMapView({
    map: map,
    L: { latLng: function (lat, lon) { return [lat, lon]; } },
    lat: 60,
    lon: 25,
    hasAppliedInitialFollowZoom: false
  });

  assert.equal(calledSetView, true);
  assert.equal(hasApplied, true);
});

test('setFollowMapView skips pan when already centered', () => {
  var panCalls = 0;
  var map = {
    getZoom: function () { return 16; },
    setView: function () {},
    getCenter: function () { return [60, 25]; },
    distance: function () { return 2; },
    panTo: function () { panCalls += 1; }
  };

  var hasApplied = setFollowMapView({
    map: map,
    L: { latLng: function (lat, lon) { return [lat, lon]; } },
    lat: 60,
    lon: 25,
    hasAppliedInitialFollowZoom: true
  });

  assert.equal(panCalls, 0);
  assert.equal(hasApplied, true);
});
