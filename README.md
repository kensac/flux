# Flux WiFi Sniffer

WiFi presence detection system for Raspberry Pi 4 with Qualcomm Atheros AR9271.

Captures probe requests and beacons, tracks devices, stores data in MongoDB, publishes events to RabbitMQ.

## Setup

```bash
docker-compose up -d
```

Check your WiFi interface name and update the `INTERFACE` env var in docker-compose.yml if needed.

## Data Access

- MongoDB: `localhost:27017` (database: `flux`)
- RabbitMQ Management: `http://localhost:15672`
- Logs: `./flux.log`
