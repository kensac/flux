# Flux WiFi Sniffer - Frontend

A modern, real-time WiFi monitoring dashboard built with React and Vite.

## Features

- 📊 **Real-time Statistics** - Live monitoring of devices and access points
- 📈 **Historical Metrics** - Interactive charts showing trends over time
- 🎛️ **Channel Hopping Control** - Configure channel hopping parameters
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔄 **Auto-refresh** - Automatic data updates every 5 seconds
- 🎨 **Modern UI** - Clean, dark theme with Tailwind CSS

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8080`

## Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

The dev server is configured to proxy API requests to `http://localhost:8080`

## Building for Production

Build the production bundle:
```bash
npm run build
```

The built files will be in the `dist/` directory.

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── StatsCard.jsx           # Statistics display
│   │   ├── DeviceTable.jsx         # Active devices table
│   │   ├── AccessPointTable.jsx    # Access points table
│   │   ├── MetricsChart.jsx        # Historical trends chart
│   │   └── ChannelHoppingControl.jsx  # Channel config panel
│   ├── services/
│   │   └── api.js           # API client
│   ├── App.jsx              # Main application component
│   ├── main.jsx             # Application entry point
│   └── index.css            # Global styles
├── index.html
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── package.json
```

## API Endpoints Used

- `GET /stats` - Overall statistics
- `GET /devices/active` - Active devices list
- `GET /access-points` - Access points list
- `GET /metrics/history` - Historical metrics data
- `GET /config/channel-hopping` - Channel hopping config
- `PUT /config/channel-hopping` - Update channel config

## Configuration

### API Proxy

The Vite dev server proxies `/api/*` requests to the backend. Update `vite.config.js` if your backend is on a different host/port:

```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://your-backend:8080',
        changeOrigin: true,
      }
    }
  }
})
```

### Auto-refresh Interval

To change the auto-refresh interval, edit `App.jsx`:

```javascript
const interval = setInterval(() => {
  fetchData();
}, 5000); // every 5 secs
```

## Features Overview

### Dashboard Components

1. **Stats Cards** - Display total and active counts for devices and APs
2. **Metrics Chart** - Line chart showing device/AP trends over time with toggleable views
3. **Channel Hopping Control** - Configure channel hopping with presets or custom channels
4. **Device Table** - Shows active devices with MAC, vendor, signal strength, packet counts, and connection status
5. **Access Point Table** - Displays detected APs with SSID, channel, signal strength, and encryption

### Real-time Updates

- Auto-refresh toggle in the header
- Manual refresh button
- Last updated timestamp
- 5-second refresh interval when enabled

## Customization

### Theming

Colors and styles are defined in:
- `tailwind.config.js` - Tailwind theme customization
- `src/index.css` - Custom CSS classes and global styles

### Adding New Components

1. Create component file in `src/components/`
2. Import and use in `App.jsx`
3. Add API calls to `src/services/api.js` if needed

## Troubleshooting

**API requests fail:**
- Ensure backend is running on port 8080
- Check browser console for CORS errors
- Verify proxy configuration in `vite.config.js`

**Charts not displaying:**
- Check that metrics data is being returned from `/metrics/history`
- Verify data format matches expected structure

**Styles not loading:**
- Run `npm install` to ensure Tailwind dependencies are installed
- Check that `tailwind.config.js` and `postcss.config.js` are present

## License

Part of the Flux WiFi Sniffer project.
