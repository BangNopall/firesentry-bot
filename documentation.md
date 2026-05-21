# FIRESENTRY Monitor Bot - Dokumentasi Proyek

## 1. Gambaran Umum

FIRESENTRY Monitor Bot adalah backend Telegram berbasis Node.js dan TypeScript untuk memantau sistem embedded ESP32. Sistem embedded membaca sensor MQ-2, DS18B20, dan IR Flame, lalu mengirim data monitoring ke broker MQTT. Bot Telegram menerima data tersebut dan menampilkannya melalui command `/status` dan `/realtime_on`.

Flow utama:

1. ESP32 membaca gas, suhu, dan flame.
2. ESP32 menentukan state lokal: `AMAN`, `ALERT`, atau `BAHAYA`.
3. ESP32 publish JSON ke topic MQTT `/firesentry/data`.
4. Bot subscribe topic tersebut dan menyimpan data sensor terakhir.
5. User Telegram melihat data melalui `/status` atau realtime monitoring.

## 2. Payload MQTT

Format payload yang diterima bot:

```json
{
  "gas": 4012,
  "temperature": 42.5,
  "flameDetected": false,
  "tempError": false,
  "gasAlert": true,
  "gasDanger": false,
  "tempAlert": true,
  "tempDanger": false,
  "state": "ALERT"
}
```

Keterangan field:

| Field           | Tipe        | Keterangan                                           |
| --------------- | ----------- | ---------------------------------------------------- |
| `gas`           | number      | Nilai ADC MQ-2 dari ESP32                            |
| `temperature`   | number/null | Suhu DS18B20 dalam Celsius, `null` jika sensor error |
| `flameDetected` | boolean     | `true` jika flame sensor mendeteksi api              |
| `tempError`     | boolean     | `true` jika DS18B20 gagal dibaca                     |
| `gasAlert`      | boolean     | `true` jika gas melewati batas alert                 |
| `gasDanger`     | boolean     | `true` jika gas melewati batas bahaya                |
| `tempAlert`     | boolean     | `true` jika suhu melewati batas alert                |
| `tempDanger`    | boolean     | `true` jika suhu melewati batas bahaya               |
| `state`         | string      | Salah satu dari `AMAN`, `ALERT`, atau `BAHAYA`       |

Bot memvalidasi payload sebelum menyimpannya. Payload invalid akan diabaikan dan hanya dicatat di debug log.

## 3. Struktur Kode

```text
src/
├── index.ts
├── commands/
│   ├── index.ts
│   ├── realtime.ts
│   ├── start.ts
│   └── status.ts
└── services/
    ├── mqtt.ts
    └── sensor.ts
```

Tanggung jawab utama:

| File                       | Fungsi                                                          |
| -------------------------- | --------------------------------------------------------------- |
| `src/index.ts`             | Entry point bot, register command, init MQTT                    |
| `src/services/mqtt.ts`     | Connect, subscribe, dan menyimpan data sensor terakhir          |
| `src/services/sensor.ts`   | Type sensor, validasi payload, formatter pesan, dummy data test |
| `src/commands/status.ts`   | Menampilkan data FIRESENTRY terbaru                             |
| `src/commands/realtime.ts` | Mengirim data realtime, pause/resume stale data, mode test      |

## 4. Environment

Contoh `.env`:

```env
BOT_TOKEN="isi_token_bot"

MQTT_URL="mqtts://xxxx.s1.eu.hivemq.cloud:8883"
MQTT_USERNAME="username"
MQTT_PASSWORD="password"
MQTT_TOPIC_SENSOR="/firesentry/data"

REALTIME_INTERVAL_MS=1000
REALTIME_STALE_MS=2000
```

`REALTIME_INTERVAL_MS` mengatur interval kirim pesan realtime. `REALTIME_STALE_MS` mengatur batas data dianggap berhenti.

## 5. Command Telegram

| Command             | Fungsi                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `/start`            | Menampilkan informasi bot dan daftar command                       |
| `/status`           | Menampilkan data sensor terakhir                                   |
| `/realtime_on`      | Mengaktifkan monitoring realtime                                   |
| `/realtime_on test` | Mengaktifkan realtime dan publish dummy payload FIRESENTRY ke MQTT |
| `/realtime_off`     | Mematikan realtime dan mode test                                   |

## 6. Verifikasi

Command yang tersedia:

```bash
npm test
npm run lint
npm run build
```

`npm test` menjalankan unit test untuk validasi payload dan formatter pesan sensor.
