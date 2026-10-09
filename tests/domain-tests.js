import { createPositionPipeline } from '../js/position-pipeline.js';
import { createRouteRecorder } from '../js/route-recorder.js';
import { createSessionRecord } from '../js/session-manager.js';
import { createSessionStore, isSessionRecord } from '../js/session-store.js';
import { haversine, normalizeAngle, shortestAngleDelta, bearingDegrees } from '../js/utils.js';
import { computeUpdatedHeading, getReliableHeadingCandidate, computeRotationAwarePanDelta } from '../js/map-rotation.js';
import { fetchAndRenderWeather } from '../js/weather.js';
import { WMO_CODES } from '../js/config.js';

export async function runTests() {
  let count = 0;
  function check(condition, description) {
    if (!condition) throw new Error(description);
    count++;
  }
  const position = (timestamp, meters, speed = 36, accuracy = 5, heading = 90) => ({
    timestamp, coords: { latitude: 60, longitude: 25 + meters / 55600, speed: speed === null ? null : speed / 3.6, accuracy, heading }
  });
  const pipeline = createPositionPipeline();
  const session = createSessionRecord('normal', 1000, 1);
  const recorder = createRouteRecorder({ haversine, minAcceptedPointDistanceM: 4, maxPointJumpDistanceM: 500,
    maxPointJumpSpeedKmh: 220, movingSpeedThresholdKmh: 2.5 });
  function feed(timestamp, meters, speed = 36, accuracy = 5) {
    const sample = pipeline.process(position(timestamp, meters, speed, accuracy), timestamp);
    if (sample.accepted && session.status === 'active') {
      session.movingDurationMs += sample.movingDeltaMs;
      if (sample.moving) recorder.addAcceptedPoint({ lat: sample.coords.latitude, lon: sample.coords.longitude,
        accuracy, speedKmh: sample.validatedSpeedKmh, heading: 90, now: timestamp,
        segmentBreak: sample.segmentBreak, activeSession: session, sessionActive: true,
        map: null, routeLayer: null, persistActiveSession() {} });
    }
    return sample;
  }
  for (let t = 1000; t < 6000; t += 1000) feed(t, 0, 0);
  check(session.routePoints.length === 0 && session.distanceMeters === 0 && session.movingDurationMs === 0, 'Stationary fixes record nothing');
  feed(6000, 10); feed(7000, 20); feed(8000, 30);
  check(session.routePoints.length === 2 && session.movingDurationMs === 1000, 'Confirmed movement counts one actual interval');
  const before = JSON.stringify(session);
  check(!feed(8000, 40).accepted && JSON.stringify(session) === before, 'Duplicate timestamp cannot mutate metrics');
  check(!feed(7500, 40).accepted && JSON.stringify(session) === before, 'Out-of-order callbacks rejected');
  check(!feed(9000, 5000, 200).accepted && session.maxSpeedKmh === 36, 'Unrealistic point cannot change maximum');
  check(!feed(10000, 40, 100, 200).accepted && session.maxSpeedKmh === 36, 'Poor accuracy cannot change maximum');
  feed(11000, 50); feed(12000, 60); feed(13000, 70);
  check(session.routePoints.some(p => p.break), 'Quality interruption starts a new segment');
  const distanceBeforeStop = session.distanceMeters;
  const timeBeforeStop = session.movingDurationMs;
  feed(14000, 70, 0); feed(15000, 70, 0); feed(16000, 70, 0);
  check(session.movingDurationMs === timeBeforeStop, 'Stopping does not add moving time');
  feed(17000, 80); feed(18000, 90);
  check(session.distanceMeters === distanceBeforeStop, 'Resuming anchors without crediting stop displacement');
  feed(19000, 100);
  check(session.distanceMeters > distanceBeforeStop, 'Movement after new anchor adds distance');
  const beforeGapDistance = session.distanceMeters, beforeGapTime = session.movingDurationMs;
  feed(120000, 2000); feed(121000, 2010);
  check(session.distanceMeters === beforeGapDistance && session.movingDurationMs === beforeGapTime, 'Large gap adds neither false distance nor time');
  feed(122000, 2020);
  check(session.distanceMeters > beforeGapDistance && session.movingDurationMs === beforeGapTime + 1000, 'GPS recovers after a gap');
  const pointCount = session.routePoints.length;
  session.status = 'completed'; feed(123000, 2030);
  check(session.routePoints.length === pointCount, 'Completed session is immutable to recording callbacks');
  const walking = createPositionPipeline();
  walking.process(position(1000, 0, 3.6), 1000);
  check(walking.process(position(2000, 1, 3.6), 2000).moving, 'Walking movement is detected');
  const stationaryNoise = createPositionPipeline();
  stationaryNoise.process(position(1000, 0, 36), 1000);
  check(!stationaryNoise.process(position(2000, 0, 36), 2000).moving, 'Identical coordinates with noisy speed cannot cause movement');
  check(!createPositionPipeline().process(position(1000, 0), 40000).accepted, 'Stale samples rejected');
  check(!createPositionPipeline().process(position(50000, 0), 1000).accepted, 'Future samples rejected');
  pipeline.reset();
  check(!pipeline.process(position(122000, 2020), 124000).accepted, 'Reset retains dedup watermark');
  const headingInput = { headingUpEnabled: true, mapRotationSupported: true, movingConfident: true,
    now: 1000, currentHeadingDeg: 359, lastReliableHeadingAt: 0,
    northUpDelayMs: 12000, rotationSmoothing: 0.26, shortestAngleDelta, normalizeAngle };
  const heading = computeUpdatedHeading({ ...headingInput, headingCandidate: 1 });
  check(Math.abs(shortestAngleDelta(359, heading.currentHeadingDeg) - 0.52) < 0.001, '359 to 1 takes short smooth path');
  check(computeUpdatedHeading({ ...headingInput, headingCandidate: 90, movingConfident: false }).currentHeadingDeg === 359, 'Stationary headings ignored');
  check(!computeUpdatedHeading({ ...headingInput, headingCandidate: 90, mapRotationSupported: false }).shouldApply, 'Unsupported rotation safely disabled');
  check(!computeUpdatedHeading({ ...headingInput, headingCandidate: 90, headingUpEnabled: false }).shouldApply, 'North-up ignores rotation');
  check(computeUpdatedHeading({ ...headingInput, headingCandidate: null, movingConfident: false, lastReliableHeadingAt: 1, now: 13000 }).currentHeadingDeg !== 359, 'Stale heading falls toward north');
  const candidate = getReliableHeadingCandidate({ coords: position(2000, 10).coords, lat: 60, lon: 25.001,
    validatedSpeedKmh: 36, headingMinSpeedKmh: 4, movingAccuracyMaxM: 55, headingMinDistanceM: 6,
    haversine, bearingDegrees, normalizeAngle });
  check(candidate === 90, 'Reliable GPS heading preferred');
  check(computeRotationAwarePanDelta({dx:10,dy:0,angleDeg:90,scale:1}).every(Number.isFinite), 'Rotated pan remains finite');
  const options = { sessionStorageKey:'test-rides-v2', settingsStorageKey:'test-preferences',
    dbName:'motodash-domain-tests', dbVersion:2, sessionsStoreName:'sessions-v2', settingsStoreName:'settings' };
  const store = createSessionStore(options);
  const record = createSessionRecord('forest');
  record.name = 'User content';
  check(isSessionRecord(record), 'New schema validates');
  check(!isSessionRecord({...record, schemaVersion:1}), 'Obsolete schema not loaded');
  await store.saveSession(record);
  check((await store.loadSessions()).some(r => r.id === record.id), 'IndexedDB save/load');
  record.name = 'Changed';
  const saved = store.saveSession(record);
  record.name = 'Mutated after enqueue';
  await saved;
  check((await store.loadSessions()).find(r => r.id === record.id).name === 'Changed', 'Save captures immutable record');
  await store.deleteSession(record.id);
  check(!(await store.loadSessions()).some(r => r.id === record.id), 'Deletion does not resurrect queued record');
  const descriptor = Object.getOwnPropertyDescriptor(window, 'indexedDB');
  Object.defineProperty(window, 'indexedDB', {value:undefined,configurable:true});
  try {
    const fallback = createSessionStore({...options, dbName:'unavailable-db', sessionStorageKey:'fallback-tests'});
    const r = createSessionRecord('normal');
    check(await fallback.saveSession(r) === 'localstorage', 'localStorage recording fallback');
    check((await fallback.loadSessions()).some(s => s.id === r.id), 'Fallback reload');
    fallback.writeSettingToLocalStorage('mapTheme','forest');
    await fallback.clearSessions();
    check((await fallback.loadSessions()).length === 0 && fallback.readSettingFromLocalStorage('mapTheme') === 'forest', 'Clear rides preserves preferences');
    const storageDescriptor = Object.getOwnPropertyDescriptor(window,'localStorage');
    Object.defineProperty(window,'localStorage',{get(){throw new Error('denied');},configurable:true});
    try {
      let rejected = false;
      try { await fallback.saveSession(createSessionRecord('normal')); } catch { rejected = true; }
      check(rejected, 'Total storage failure is observable, not false success');
    } finally { Object.defineProperty(window,'localStorage',storageDescriptor); }
  } finally {
    if (descriptor) Object.defineProperty(window,'indexedDB',descriptor); else delete window.indexedDB;
  }
  const weather = [document.createElement('div'), document.createElement('div'), document.createElement('div')];
  const success = await fetchAndRenderWeather(60,25,{isOnline:true, weatherRowEl:weather[0],temperatureRowEl:weather[1],windRowEl:weather[2],wmoCodes:WMO_CODES,fetchImpl:async()=>({ok:false,json:async()=>({})})});
  check(success === false && weather[0].textContent === 'Weather unavailable', 'Weather HTTP failure safely renders fallback');
  const offline = await fetchAndRenderWeather(60,25,{isOnline:false, weatherRowEl:weather[0],temperatureRowEl:weather[1],windRowEl:weather[2],wmoCodes:WMO_CODES,fetchImpl:()=>{throw new Error('must not fetch');}});
  check(offline === false, 'Offline weather makes no request');
  return `${count} deterministic GPS/route/heading/storage/weather assertions`;
}
