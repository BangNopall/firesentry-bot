import { Context } from 'telegraf';
import createDebug from 'debug';
import { getLastSensorData, client, MQTT_TOPIC_SENSOR } from '../services/mqtt';
import {
  createRandomSensorPayload,
  formatSensorMessage,
} from '../services/sensor';

const debug = createDebug('bot:realtime_command');

const parsePositiveMs = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const INTERVAL_MS = parsePositiveMs(process.env.REALTIME_INTERVAL_MS, 1000);
const STALE_TIMEOUT_MS = parsePositiveMs(
  process.env.REALTIME_STALE_MS,
  INTERVAL_MS * 2,
);

const realtimeIntervals = new Map<number, NodeJS.Timeout>();
const staleChats = new Set<number>();

let testPublishTimer: NodeJS.Timeout | null = null;

export const realtimeOn = () => async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = (ctx.message as any)?.text ?? '';
  const isTest = text.toLowerCase().includes('test');

  debug(`realtime_on requested by chat ${chatId}, isTest=${isTest}`);

  // ==========================
  // 1) MODE TEST: kirim data random ke MQTT
  // ==========================
  if (isTest) {
    if (!client) {
      await ctx.reply(
        '⚠️ MQTT client belum siap. Pastikan initMqtt() sudah dipanggil.',
      );
    } else if (testPublishTimer) {
      await ctx.reply(
        'ℹ️ Mode TEST sudah aktif. Bot sedang mengirim data random ke MQTT.',
      );
    } else {
      await ctx.reply(
        '✅ Mode TEST DIaktifkan.\n' +
          'Bot akan mengirim data sensor RANDOM ke MQTT setiap 5 detik.\n' +
          `Topic: \`${MQTT_TOPIC_SENSOR}\``,
        { parse_mode: 'Markdown' },
      );

      testPublishTimer = setInterval(() => {
        if (!client) return;

        const payload = JSON.stringify(createRandomSensorPayload());

        client.publish(MQTT_TOPIC_SENSOR, payload, { qos: 0, retain: false });
        debug('📤 TEST SENSOR payload: %s', payload);
      }, 5000);
    }
  }

  if (realtimeIntervals.has(chatId)) {
    await ctx.reply(
      'ℹ️ Realtime monitoring sudah AKTIF untuk chat ini.\n' +
        'Gunakan /realtime_off untuk mematikannya.',
    );
    return;
  }

  staleChats.delete(chatId);

  const data = getLastSensorData();

  if (!data) {
    await ctx.reply(
      '✅ Realtime monitoring Diaktifkan.\n' +
        '⚠️ Belum ada data sensor yang diterima dari MQTT.\n\n' +
        'Bot akan mulai mengirim status ketika sensor mulai mengirim data ke broker.',
    );
  } else {
    await ctx.reply(
      '✅ Realtime monitoring Diaktifkan.\n' +
        `Interval: setiap ${INTERVAL_MS / 1000} detik.\n` +
        `Jika data sensor berhenti, bot akan *pause* kirim status dan otomatis lanjut lagi saat data kembali.`,
      { parse_mode: 'Markdown' },
    );
  }

  // ==========================
  // 3) INTERVAL UNTUK KIRIM STATUS KE TELEGRAM
  // ==========================
  const timer = setInterval(async () => {
    const latest = getLastSensorData();

    if (!latest) {
      debug('No sensor data yet, skip send for chat: %s', chatId);
      return;
    }

    const now = Date.now();
    const age = now - latest.timestamp;

    if (age > STALE_TIMEOUT_MS) {
      if (!staleChats.has(chatId)) {
        staleChats.add(chatId);

        debug(
          'Sensor data is stale for chat %s (age=%d ms), pausing realtime messages',
          chatId,
          age,
        );

        try {
          await ctx.telegram.sendMessage(
            chatId,
            '⏸ Realtime monitoring *pause*.\n' +
              `Tidak ada data baru dari sensor lebih dari ${Math.round(
                STALE_TIMEOUT_MS / 1000,
              )} detik.\n\n` +
              'Bot akan otomatis melanjutkan kirim status ketika data sensor kembali.',
            { parse_mode: 'Markdown' },
          );
        } catch (err) {
          debug('Failed to send stale warning to %s: %O', chatId, err);
        }
      }
      return;
    }

    if (staleChats.has(chatId)) {
      staleChats.delete(chatId);

      try {
        await ctx.telegram.sendMessage(
          chatId,
          '▶️ Data sensor sudah *aktif kembali*.\n' +
            'Bot akan melanjutkan kirim status realtime.',
          { parse_mode: 'Markdown' },
        );
      } catch (err) {
        debug('Failed to send resume message to %s: %O', chatId, err);
      }
    }

    const message = formatSensorMessage(
      latest,
      '📡 *Realtime Status FIRESENTRY*',
    );

    try {
      await ctx.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      debug('Failed to send realtime message to %s: %O', chatId, err);
    }
  }, INTERVAL_MS);

  realtimeIntervals.set(chatId, timer);
};

export const realtimeOff = () => async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  debug(`realtime_off requested by chat ${chatId}`);

  // Hentikan interval realtime
  const timer = realtimeIntervals.get(chatId);
  if (timer) {
    clearInterval(timer);
    realtimeIntervals.delete(chatId);
    staleChats.delete(chatId);
  }

  // Hentikan juga TEST publisher kalau ada
  const hadTestPublishTimer = Boolean(testPublishTimer);
  if (testPublishTimer) {
    clearInterval(testPublishTimer);
    testPublishTimer = null;
  }

  if (!timer && !hadTestPublishTimer) {
    await ctx.reply('ℹ️ Realtime monitoring belum aktif untuk chat ini.');
    return;
  }

  await ctx.reply('🛑 Realtime monitoring DIMATIKAN untuk chat ini');
};
