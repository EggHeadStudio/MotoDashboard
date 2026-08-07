import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeolocationErrorMessage, isGeolocationSupported, startGeoWatch, stopGeoWatch } from '../js/gps.js';

test('getGeolocationErrorMessage maps denied permission to a Finnish message', () => {
  var message = getGeolocationErrorMessage({ code: 1 });
  assert.match(message, /Sijaintilupa/i);
});

test('isGeolocationSupported checks navigator geolocation support', () => {
  assert.equal(isGeolocationSupported({ geolocation: {} }), true);
  assert.equal(isGeolocationSupported({}), false);
});

test('startGeoWatch and stopGeoWatch delegate to the browser API', () => {
  var calls = [];
  var api = {
    watchPosition: function () {
      calls.push('watch');
      return 7;
    },
    clearWatch: function (id) {
      calls.push('clear:' + id);
    }
  };

  var watchId = startGeoWatch(api, function () {}, function () {});
  stopGeoWatch(api, watchId);

  assert.equal(watchId, 7);
  assert.deepEqual(calls, ['watch', 'clear:7']);
});
