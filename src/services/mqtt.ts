// src/services/mqtt.ts
import mqtt, { MqttClient } from 'mqtt';
import createDebug from 'debug';
import { parseSensorPayload } from './sensor';
import type { SensorData } from './sensor';

const debug = createDebug('bot:mqtt');

const MQTT_URL = process.env.MQTT_URL || '';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
export const MQTT_TOPIC_SENSOR =
  process.env.MQTT_TOPIC_SENSOR || '/firesentry/data';

export let client: MqttClient | null = null;
let lastSensorData: SensorData | null = null;

export const initMqtt = () => {
  if (client || !MQTT_URL) {
    if (!MQTT_URL) {
      debug('MQTT_URL not set, MQTT will not be initialized');
    }
    return;
  }

  debug('Connecting to MQTT broker...');

  client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
  });

  client.on('connect', () => {
    debug('Connected to MQTT broker');
    client?.subscribe(MQTT_TOPIC_SENSOR, { qos: 1 }, (err) => {
      if (err) {
        debug('Subscribe error: %O', err);
      } else {
        debug('Subscribed to topic %s', MQTT_TOPIC_SENSOR);
      }
    });
  });

  client.on('error', (err) => {
    debug('MQTT error: %O', err);
  });

  client.on('message', (topic, payload) => {
    if (topic !== MQTT_TOPIC_SENSOR) return;

    const sensorData = parseSensorPayload(payload.toString());

    if (!sensorData) {
      debug('Failed to parse sensor payload: %s', payload.toString());
      return;
    }

    lastSensorData = sensorData;
    debug('New sensor data: %O', lastSensorData);
  });
};

export const getLastSensorData = (): SensorData | null => lastSensorData;
