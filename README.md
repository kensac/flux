# Flux WiFi Sniffer

High-performance WiFi presence detection system in C for Raspberry Pi 4.

## Setup

Put WiFi adapter in monitor mode:
```bash
sudo ip link set wlan0 down
sudo iw wlan0 set monitor control
sudo ip link set wlan0 up
```

Start:
```bash
docker-compose up -d
```

## Data

MongoDB: `localhost:27017` (database: `flux`)

- Collection: `devices` - captured MAC addresses with timestamps
- Collection: `access_points` - beacon frames with SSIDs/channels
- Collection: `device_samples` - high-resolution per-device RSSI samples (approximately 1-minute precision, retained for 1 hour)
- Collection: `device_samples_5m` - aggregated 5-minute RSSI windows per device (retained for 7 days)
- Collection: `device_samples_hourly` - hourly RSSI aggregates per device (retained for 90 days)
- Collection: `ap_samples` - high-resolution per-access-point RSSI samples (retained for 1 hour)
- Collection: `ap_samples_5m` - aggregated 5-minute RSSI windows per access point (retained for 7 days)
- Collection: `ap_samples_hourly` - hourly RSSI aggregates per access point (retained for 90 days)

Retention strategy:

- **Raw samples (`device_samples`, `ap_samples`)** provide the highest fidelity and power detailed minute-by-minute charts. They are automatically pruned after 60 minutes to keep storage growth under control.
- **5-minute aggregates** collapse recent history into rolling windows while still capturing short-term trends. The API keeps 7 days of these documents so dashboards can display recent days with fine detail.
- **Hourly aggregates** summarize longer-term behavior for trend lines and weekly/monthly analytics. They are stored for 90 days by default.

The API selects the most appropriate collection automatically based on the requested time span. For example, the new `GET /devices/history` endpoint returns raw samples for short (≤30 minute) ranges, 5-minute buckets for ranges up to 12 hours, and hourly data for longer queries. The `/access-points/history` endpoint follows the same rules for BSSID history. Clients can rely on these retention windows and resolutions when planning charts or analytics queries.
