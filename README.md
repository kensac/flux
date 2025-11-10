# Flux WiFi Sniffer

A comprehensive/high performacne WiFi monitoring system in C with packet capture, real-time analysis, and a modern web dashboard.

## System Architecture

- **Sniffer** (C) - Captures WiFi packets in monitor mode on Raspberry Pi 4
- **API** (Go) - RESTful backend with MongoDB storage and Swagger docs
- **Frontend** (React + Vite) - Real-time monitoring dashboard
- **Database** (MongoDB) - Time-series metrics and device data

## Features

### Backend
- WiFi packet capture in monitor mode
- Device and access point detection
- RSSI tracking and signal strength monitoring
- MAC address vendor identification
- Channel hopping control
- Time-series metrics aggregation (1m, 5m, 1h tiers)
- RESTful API with Swagger documentation

### Frontend Dashboard
- 📊 Real-time statistics display
- 📈 Interactive historical charts (Recharts)
- 📱 Responsive design (mobile/tablet/desktop)
- 🎛️ Channel hopping configuration
- 🔄 Auto-refresh with 5-second intervals
- 🎨 Modern dark theme UI with Tailwind CSS
- ⚡ Fast, built with React + Vite

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access the application:**
- Dashboard: `http://localhost:3000`
- API: `http://localhost:8080`
- API Docs: `http://localhost:8080/static/api-docs.html`

### Development Setup

#### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on `http://localhost:3000` with API proxy to port 8080.

#### API Development

```bash
cd api
go mod download
go run .
```

## Setup

Put WiFi adapter in monitor mode:
```bash
sudo ip link set wlan0 down
sudo iw wlan0 set monitor control
sudo ip link set wlan0 up
```

Update `docker-compose.yml` with the wireless interface:
```yaml
environment:
  - INTERFACE=wlx24ec998bf0ce  
```

## Architecture Details

### Data Flow
1. **Sniffer** captures WiFi packets → sends to API via HTTP POST
2. **API** processes data → stores in MongoDB
3. **Aggregation service** creates time-series snapshots
4. **Frontend** fetches data via REST API → displays in real-time

### API Endpoints

- `GET /stats` - Overall statistics
- `GET /devices` - List all devices
- `GET /devices/active` - Active devices (configurable time window)
- `GET /access-points` - List access points
- `GET /metrics/history` - Historical metrics with time-series data
- `GET /metrics/summary` - Aggregated statistics summary
- `GET /config/channel-hopping` - Get channel hopping config
- `PUT /config/channel-hopping` - Update channel hopping config
- `POST /ingest/device` - Ingest device data (used by sniffer)

Full API documentation: `http://localhost:8080/static/api-docs.html`

## Data

MongoDB: `localhost:27017` (database: `flux`)
- Collection: `devices` - captured MAC addresses with timestamps, RSSI, vendor info
- Collection: `access_points` - beacon frames with SSIDs/channels
- Collection: `metrics_snapshots` - time-series aggregated metrics
- Collection: `config` - system configuration (channel hopping, etc.)

## Project Structure

```
flux/
├── frontend/              # React + Vite dashboard
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API client
│   │   └── App.jsx       # Main app
│   ├── Dockerfile
│   └── package.json
├── api/                   # Go REST API
│   ├── handlers_*.go     # API handlers
│   ├── models.go         # Data models
│   ├── aggregation.go    # Metrics aggregation
│   └── Dockerfile
├── src/                   # C sniffer
│   ├── main.c
│   ├── sniffer.c
│   └── packet_handler.c
├── docker-compose.yml
└── README.md
```

## Technology Stack

### Frontend
- React 18
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (charts)
- Axios (HTTP client)
- Lucide React (icons)
- date-fns (date utilities)

### Backend
- Go 1.21+
- MongoDB driver
- Gorilla Mux (routing)
- Swagger (API docs)

### Sniffer
- C with libpcap
- libcurl (HTTP client)

## Contributing

1. Frontend changes: Edit files in `frontend/src/`
2. API changes: Edit files in `api/`
3. Sniffer changes: Edit files in `src/`

