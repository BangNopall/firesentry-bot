# FIRESENTRY Monitor Bot

> Telegram Bot untuk monitoring sensor Gas (MQ-2), Suhu (DS18B20), dan Api (IR Flame) berbasis ESP32, MQTT HiveMQ Cloud, dan Telegraf.js.

Proyek ini dibuat untuk tugas akhir mata kuliah **Mikroprosesor & Mikrokontroler** oleh **Kelompok 6 (MNMKEL6)**.

---

## 🚀 Fitur Utama

| Command | Fungsi |
| --- | --- |
| `/start` atau `/help` | Menampilkan informasi bot dan daftar perintah |
| `/status` | Menampilkan data sensor terbaru dari MQTT |
| `/realtime_on` | Mengaktifkan monitoring realtime untuk kondisi ALERT & BAHAYA |
| `/realtime_on test` | Mengaktifkan realtime + simulasi data sensor random ke MQTT |
| `/realtime_off` | Mematikan realtime monitoring dan mode test |

### 📡 Realtime Monitoring Cerdas

- Mengirim notifikasi **hanya** saat status `ALERT` atau `BAHAYA`
- Cek data sensor setiap `REALTIME_INTERVAL_MS` (default: setiap 1 detik)
- **Pause otomatis** bila data sensor berhenti lebih dari `REALTIME_STALE_MS` (default: 45 detik)
- **Resume otomatis** bila data sensor kembali aktif — tanpa perlu mengetik `/realtime_on` ulang

### 🧪 Mode TEST (tanpa ESP32)

- Bot mempublikasikan data sensor **random** ke MQTT setiap **5 detik**
- Data diterima kembali oleh bot via subscribe, sehingga realtime berjalan normal
- Cocok untuk menguji sistem saat ESP32 tidak tersedia

---

## 📡 Arsitektur Sistem

```
ESP32 (MQ-2 + DS18B20 + Flame Sensor)
        │
   Publish JSON via MQTT
        │
  HiveMQ Cloud Broker
        │
  Node.js + TypeScript (Bot Subscriber)
        │
   Telegram Bot (Telegraf.js)
```

### Format Payload MQTT

Bot menerima payload JSON dari topic `MQTT_TOPIC_SENSOR` (default: `/firesentry/data`):

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

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `gas` | `number` | Nilai ADC MQ-2 dari ESP32 |
| `temperature` | `number \| null` | Suhu DS18B20 dalam Celsius; `null` jika sensor error |
| `flameDetected` | `boolean` | `true` jika flame sensor mendeteksi api |
| `tempError` | `boolean` | `true` jika DS18B20 gagal dibaca |
| `gasAlert` | `boolean` | `true` jika gas melewati batas alert |
| `gasDanger` | `boolean` | `true` jika gas melewati batas bahaya |
| `tempAlert` | `boolean` | `true` jika suhu melewati batas alert |
| `tempDanger` | `boolean` | `true` jika suhu melewati batas bahaya |
| `state` | `"AMAN" \| "ALERT" \| "BAHAYA"` | State sistem dari ESP32 |

Payload yang tidak valid akan diabaikan dan dicatat di debug log.

---

## 📁 Struktur Direktori

```
.
├── .env                        # Environment variable (tidak di-commit)
├── .env-sample                 # Contoh konfigurasi .env
├── package.json
├── tsconfig.json
├── tests/                      # Unit test
└── src/
    ├── index.ts                # Entry point: inisialisasi bot & MQTT
    ├── commands/
    │   ├── index.ts            # Re-export semua command
    │   ├── start.ts            # /start, /help
    │   ├── status.ts           # /status
    │   └── realtime.ts         # /realtime_on, /realtime_off, mode test
    └── services/
        ├── mqtt.ts             # Koneksi MQTT, subscribe, simpan data terakhir
        └── sensor.ts           # Type, validasi payload, formatter pesan, dummy data
```

---

## ⚙️ Setup Environment

Salin `.env-sample` menjadi `.env` dan isi nilainya:

```bash
cp .env-sample .env
```

```env
BOT_TOKEN=""

MQTT_URL="mqtts://xxxx.s1.eu.hivemq.cloud:8883"
MQTT_USERNAME="username"
MQTT_PASSWORD="password"
MQTT_TOPIC_SENSOR="/firesentry/data"

REALTIME_INTERVAL_MS=1000
REALTIME_STALE_MS=45000
```

| Variable | Keterangan |
| --- | --- |
| `BOT_TOKEN` | Token Telegram Bot dari @BotFather |
| `MQTT_URL` | URL broker MQTT (HiveMQ Cloud, format `mqtts://`) |
| `MQTT_USERNAME` | Username MQTT |
| `MQTT_PASSWORD` | Password MQTT |
| `MQTT_TOPIC_SENSOR` | Topic MQTT yang disubscribe bot (default: `/firesentry/data`) |
| `REALTIME_INTERVAL_MS` | Interval cek data realtime dalam milidetik (default: `1000`) |
| `REALTIME_STALE_MS` | Batas waktu data dianggap stale/berhenti dalam milidetik (default: `45000`). Gunakan nilai lebih besar dari interval publish ESP32. |

---

## 🧩 Instalasi

```bash
npm install
```

---

## 🛠 Menjalankan (Development)

```bash
npm run dev
```

Bot akan:
- Terhubung ke broker MQTT
- Menjalankan polling update Telegram
- Mencetak debug log ke terminal (prefix `bot:*`)

Untuk Windows:

```bash
npm run devWindows
```

---

## 🧪 Verifikasi & Quality Check

```bash
# Unit test (validasi payload & formatter)
npm test

# Type check tanpa build
npm run lint

# Format kode
npm run prettier
```

---

## 🏗️ Build & Production

Build ke single file (output di folder `public/`):

```bash
npm run build
```

### Menjalankan dengan PM2 (VPS)

```bash
# Start
pm2 start npm --name firesentry-bot -- run start

# Lihat log
pm2 logs firesentry-bot

# Restart
pm2 restart firesentry-bot

# Stop
pm2 stop firesentry-bot
```

Script `start` di `package.json`:

```json
"start": "NODE_ENV=production DEBUG=bot* dotenv -- node -r ts-node/register src/index.ts"
```

---

## 🔧 Teknologi

| Komponen | Teknologi |
| --- | --- |
| IoT | ESP32 + MQ-2 Gas Sensor + DS18B20 + IR Flame Sensor |
| Telegram Bot | Telegraf.js v4 |
| Backend | Node.js + TypeScript |
| IoT Messaging | MQTT.js v5 + HiveMQ Cloud |
| Build | @vercel/ncc |
| Deployment | PM2 (VPS) |
| Logging | debug module |

---

## 👨‍💻 Tim Pengembang

Dikembangkan oleh **Kelompok 6 (MNMKEL6)** untuk tugas akhir **Mikroprosesor & Mikrokontroler**.

Author: [BangNopall](https://github.com/BangNopall)

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan pembelajaran dan pengembangan sistem IoT. Lihat file [LICENSE](./LICENSE) untuk detail.
