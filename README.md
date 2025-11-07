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
