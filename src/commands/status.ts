import { Context } from 'telegraf';
import createDebug from 'debug';
import { getLastSensorData, MQTT_TOPIC_SENSOR } from '../services/mqtt';
import { formatSensorMessage } from '../services/sensor';

const debug = createDebug('bot:status_command');

export const status = () => async (ctx: Context) => {
  debug(`Triggered "status" command from ${ctx.from?.id}`);

  const data = getLastSensorData();

  if (!data) {
    await ctx.reply(
      '⚠️ Belum ada data sensor yang diterima dari MQTT.\n\n' +
        'Pastikan ESP32 sudah terkoneksi ke broker dan mengirim data ke topic:\n' +
        `\`${MQTT_TOPIC_SENSOR}\``,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const message = formatSensorMessage(data, '📊 *Status FIRESENTRY Terkini*');

  await ctx.reply(message, { parse_mode: 'Markdown' });
};
