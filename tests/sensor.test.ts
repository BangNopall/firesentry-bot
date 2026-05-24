import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSensorReasons,
  formatSensorMessage,
  parseSensorPayload,
  shouldSendRealtimeState,
} from '../src/services/sensor';

test('parseSensorPayload accepts FIRESENTRY sensor payloads', () => {
  const payload = JSON.stringify({
    gas: 4012,
    temperature: 42.5,
    flameDetected: false,
    tempError: false,
    gasAlert: true,
    gasDanger: false,
    tempAlert: true,
    tempDanger: false,
    state: 'ALERT',
  });

  const parsed = parseSensorPayload(payload, 1710000000000);

  assert.deepEqual(parsed, {
    gas: 4012,
    temperature: 42.5,
    flameDetected: false,
    tempError: false,
    gasAlert: true,
    gasDanger: false,
    tempAlert: true,
    tempDanger: false,
    state: 'ALERT',
    timestamp: 1710000000000,
  });
});

test('parseSensorPayload rejects malformed payloads', () => {
  assert.equal(parseSensorPayload('not-json', 1710000000000), null);
  assert.equal(
    parseSensorPayload(
      JSON.stringify({
        gas: '4012',
        temperature: 42.5,
        flameDetected: false,
        tempError: false,
        gasAlert: true,
        gasDanger: false,
        tempAlert: true,
        tempDanger: false,
        state: 'ALERT',
      }),
      1710000000000,
    ),
    null,
  );
});

test('buildSensorReasons explains emergency and alert triggers', () => {
  const reasons = buildSensorReasons({
    gas: 4095,
    temperature: 64,
    flameDetected: true,
    tempError: false,
    gasAlert: true,
    gasDanger: true,
    tempAlert: true,
    tempDanger: true,
    state: 'BAHAYA',
    timestamp: 1710000000000,
  });

  assert.deepEqual(reasons, [
    'Api terdeteksi',
    'Gas melewati batas bahaya',
    'Suhu melewati batas bahaya',
  ]);
});

test('formatSensorMessage renders FIRESENTRY status text', () => {
  const message = formatSensorMessage(
    {
      gas: 4012,
      temperature: 42.5,
      flameDetected: false,
      tempError: false,
      gasAlert: true,
      gasDanger: false,
      tempAlert: true,
      tempDanger: false,
      state: 'ALERT',
      timestamp: 1710000000000,
    },
    '📊 *Status FIRESENTRY Terkini*',
  );

  assert.match(message, /Gas MQ-2: \*4012\*/);
  assert.match(message, /Suhu: \*42\.50 C\*/);
  assert.match(message, /Flame: ✅ Tidak terdeteksi/);
  assert.match(message, /Status: ⚠️ \*ALERT\*/);
  assert.match(
    message,
    /Pemicu: Gas melewati batas alert, Suhu melewati batas alert/,
  );
});

test('shouldSendRealtimeState only allows alert and emergency states', () => {
  assert.equal(shouldSendRealtimeState('AMAN'), false);
  assert.equal(shouldSendRealtimeState('ALERT'), true);
  assert.equal(shouldSendRealtimeState('BAHAYA'), true);
});
