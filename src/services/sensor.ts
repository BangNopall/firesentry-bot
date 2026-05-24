export type SensorState = 'AMAN' | 'ALERT' | 'BAHAYA';

export interface SensorData {
  gas: number;
  temperature: number | null;
  flameDetected: boolean;
  tempError: boolean;
  gasAlert: boolean;
  gasDanger: boolean;
  tempAlert: boolean;
  tempDanger: boolean;
  state: SensorState;
  timestamp: number;
}

type SensorPayload = Omit<SensorData, 'timestamp'>;

const SENSOR_STATES = new Set<SensorState>(['AMAN', 'ALERT', 'BAHAYA']);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isSensorState = (value: unknown): value is SensorState => {
  return typeof value === 'string' && SENSOR_STATES.has(value as SensorState);
};

export const parseSensorPayload = (
  payload: string,
  timestamp = Date.now(),
): SensorData | null => {
  let json: unknown;

  try {
    json = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!isRecord(json)) return null;

  const temperature = json.temperature;
  const tempError = json.tempError;

  if (
    !isFiniteNumber(json.gas) ||
    !(isFiniteNumber(temperature) || temperature === null) ||
    !isBoolean(json.flameDetected) ||
    !isBoolean(tempError) ||
    !isBoolean(json.gasAlert) ||
    !isBoolean(json.gasDanger) ||
    !isBoolean(json.tempAlert) ||
    !isBoolean(json.tempDanger) ||
    !isSensorState(json.state)
  ) {
    return null;
  }

  if (!tempError && temperature === null) return null;

  return {
    gas: json.gas,
    temperature,
    flameDetected: json.flameDetected,
    tempError,
    gasAlert: json.gasAlert,
    gasDanger: json.gasDanger,
    tempAlert: json.tempAlert,
    tempDanger: json.tempDanger,
    state: json.state,
    timestamp,
  };
};

export const buildSensorReasons = (data: SensorData): string[] => {
  if (data.state === 'BAHAYA') {
    const reasons = [];
    if (data.flameDetected) reasons.push('Api terdeteksi');
    if (data.gasDanger) reasons.push('Gas melewati batas bahaya');
    if (data.tempDanger) reasons.push('Suhu melewati batas bahaya');
    return reasons.length > 0 ? reasons : ['Kondisi bahaya dari perangkat'];
  }

  if (data.state === 'ALERT') {
    const reasons = [];
    if (data.gasAlert) reasons.push('Gas melewati batas alert');
    if (data.tempAlert) reasons.push('Suhu melewati batas alert');
    return reasons.length > 0 ? reasons : ['Kondisi alert dari perangkat'];
  }

  return ['Semua sensor dalam batas aman'];
};

export const getStateStatusText = (state: SensorState): string => {
  switch (state) {
    case 'BAHAYA':
      return '🚨 *BAHAYA*';
    case 'ALERT':
      return '⚠️ *ALERT*';
    case 'AMAN':
      return '✅ *AMAN*';
  }
};

export const shouldSendRealtimeState = (state: SensorState): boolean => {
  return state === 'ALERT' || state === 'BAHAYA';
};

export const formatSensorDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
  });
};

export const formatSensorMessage = (
  data: SensorData,
  title: string,
): string => {
  const temperatureText =
    data.tempError || data.temperature === null
      ? '*ERROR*'
      : `*${data.temperature.toFixed(2)} C*`;

  const flameText = data.flameDetected
    ? '🔥 *Api terdeteksi*'
    : '✅ Tidak terdeteksi';

  return (
    `${title}\n\n` +
    `Gas MQ-2: *${data.gas}* (nilai ADC)\n` +
    `Suhu: ${temperatureText}\n` +
    `Flame: ${flameText}\n\n` +
    `Status: ${getStateStatusText(data.state)}\n` +
    `Pemicu: ${buildSensorReasons(data).join(', ')}\n\n` +
    `Diterima pada: _${formatSensorDate(data.timestamp)}_`
  );
};

const buildSensorPayload = (
  gas: number,
  temperature: number,
  flameDetected: boolean,
): SensorPayload => {
  const gasAlert = gas > 4000;
  const gasDanger = gas > 4090;
  const tempAlert = temperature > 40;
  const tempDanger = temperature > 60;
  const state: SensorState =
    flameDetected || gasDanger || tempDanger
      ? 'BAHAYA'
      : gasAlert || tempAlert
        ? 'ALERT'
        : 'AMAN';

  return {
    gas,
    temperature,
    flameDetected,
    tempError: false,
    gasAlert,
    gasDanger,
    tempAlert,
    tempDanger,
    state,
  };
};

export const createRandomSensorPayload = (): SensorPayload => {
  const gas = 3000 + Math.floor(Math.random() * 1096);
  const temperature = Number((25 + Math.random() * 50).toFixed(2));
  const flameDetected = Math.random() < 0.15;

  return buildSensorPayload(gas, temperature, flameDetected);
};
