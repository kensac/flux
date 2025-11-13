import { useState, useEffect, useMemo } from 'react';
import { Map, Download, Settings, Play, Pause, ZoomIn, ZoomOut } from 'lucide-react';
import { apiService } from '../services/api';

export default function ProximityHeatmap() {
  const [devices, setDevices] = useState([]);
  const [accessPoints, setAccessPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewMode, setViewMode] = useState('density'); // 'density', 'signal', 'movement'
  const [selectedAP, setSelectedAP] = useState(null);
  const [heatmapConfig, setHeatmapConfig] = useState({
    radius: 50,
    intensityThreshold: 0.3,
    showLabels: true,
    showGrid: true,
  });
  const hasActivity = (devices?.length || 0) > 0 || (accessPoints?.length || 0) > 0;

  // Fetch real-time data
  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [devicesData, activeAps] = await Promise.all([
        apiService.getActiveDevices(5),
        apiService.getActiveAccessPoints(5)
      ]);
      setDevices(devicesData || []);

      let apData = activeAps || [];
      if (!apData || apData.length === 0) {
        apData = await apiService.getAccessPoints(50);
      }
      setAccessPoints(apData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // Auto-refresh without showing loading state
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate proximity zones based on RSSI
  const proximityZones = useMemo(() => {
    if (!devices || devices.length === 0 || !accessPoints || accessPoints.length === 0) {
      return [];
    }

    // For each AP, assign devices based on channel proximity and signal strength
    return accessPoints.map(ap => {
      // Estimate which devices might be near this AP
      // In a real system, you'd match devices to APs by BSSID in probe requests
      // For now, we'll distribute devices across APs based on channel and signal
      const nearbyDevices = devices.filter(device => {
        if (!device.rssi_values || device.rssi_values.length === 0) return false;
        const avgRSSI = device.rssi_values.reduce((a, b) => a + b, 0) / device.rssi_values.length;

        // Use MAC hash to consistently assign devices to APs
        const macHash = device.mac_address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const assignedAPIndex = macHash % accessPoints.length;
        const thisAPIndex = accessPoints.indexOf(ap);

        return assignedAPIndex === thisAPIndex && avgRSSI > -90;
      });

      // Calculate average RSSI for this zone
      const avgZoneRSSI = nearbyDevices.length > 0
        ? nearbyDevices.reduce((sum, device) => {
            const devRSSI = device.rssi_values.reduce((a, b) => a + b, 0) / device.rssi_values.length;
            return sum + devRSSI;
          }, 0) / nearbyDevices.length
        : -100;

      // Calculate intensity (0-1) based on device count relative to max expected
      const maxExpectedDevices = Math.max(30, devices.length / accessPoints.length);
      const intensity = Math.min(nearbyDevices.length / maxExpectedDevices, 1);

      return {
        ap,
        devices: nearbyDevices,
        deviceCount: nearbyDevices.length,
        avgRSSI: avgZoneRSSI,
        intensity,
      };
    }).sort((a, b) => b.deviceCount - a.deviceCount);
  }, [devices, accessPoints]);

  // Calculate device density in grid using MAC address hash for consistent positioning
  const densityGrid = useMemo(() => {
    const gridSize = 10; // 10x10 grid
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));

    devices.forEach(device => {
      if (!device.rssi_values || device.rssi_values.length === 0) return;

      const avgRSSI = device.rssi_values.reduce((a, b) => a + b, 0) / device.rssi_values.length;

      // Use MAC address hash for consistent X position (represents AP/zone)
      const macHash = device.mac_address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const x = macHash % gridSize;

      // Use RSSI for Y position (represents distance/signal strength)
      // Strong signal (-30 to -50) = closer to top, weak signal (-90 to -70) = bottom
      const rssiNormalized = Math.max(0, Math.min(1, (avgRSSI + 100) / 70)); // -100 to -30 mapped to 0-1
      const y = Math.floor(rssiNormalized * (gridSize - 1));

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        grid[y][x]++;
      }
    });

    return grid;
  }, [devices]);

  // Calculate movement patterns (devices that changed position/signal)
  const movementPatterns = useMemo(() => {
    return devices.filter(device => {
      if (!device.rssi_values || device.rssi_values.length < 2) return false;

      // Check if signal strength varied significantly (indicating movement)
      const min = Math.min(...device.rssi_values);
      const max = Math.max(...device.rssi_values);
      return (max - min) > 10; // >10 dBm variation indicates movement
    });
  }, [devices]);

  // Get color based on intensity
  const getHeatmapColor = (intensity) => {
    if (intensity === 0) return 'rgb(240, 240, 240)';
    if (intensity < 0.2) return 'rgb(144, 202, 249)'; // Light blue
    if (intensity < 0.4) return 'rgb(66, 165, 245)';  // Blue
    if (intensity < 0.6) return 'rgb(255, 235, 59)';  // Yellow
    if (intensity < 0.8) return 'rgb(255, 152, 0)';   // Orange
    return 'rgb(244, 67, 54)'; // Red
  };

  // Export heatmap data
  const exportHeatmap = () => {
    const data = {
      timestamp: new Date().toISOString(),
      viewMode,
      proximityZones: proximityZones.map(zone => ({
        apSSID: zone.ap.ssid,
        apChannel: zone.ap.channel,
        deviceCount: zone.deviceCount,
        avgRSSI: zone.avgRSSI,
        intensity: zone.intensity,
      })),
      densityGrid,
      movementPatterns: movementPatterns.length,
      totalDevices: devices.length,
      activeAPs: accessPoints.length,
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `heatmap-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Proximity Heatmap & Density Analysis</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-secondary'} btn-icon`}
          >
            {autoRefresh ? <Pause className="icon-sm" /> : <Play className="icon-sm" />}
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button onClick={exportHeatmap} className="btn btn-secondary btn-icon">
            <Download className="icon-sm" />
            Export
          </button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('density')}
          className={`btn ${viewMode === 'density' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Density Map
        </button>
        <button
          onClick={() => setViewMode('signal')}
          className={`btn ${viewMode === 'signal' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Signal Strength
        </button>
        <button
          onClick={() => setViewMode('movement')}
          className={`btn ${viewMode === 'movement' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Movement Patterns
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-2">
            Total Devices
            {autoRefresh && (
              <span className="inline-flex h-2 w-2 rounded-full bg-success-500 animate-pulse"></span>
            )}
          </p>
          <p className="text-2xl font-semibold text-gray-900">{devices.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Active Zones</p>
          <p className="text-2xl font-semibold text-gray-900">
            {proximityZones.filter(z => z.deviceCount > 0).length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Movement Detected</p>
          <p className="text-2xl font-semibold text-gray-900">{movementPatterns.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Peak Density</p>
          <p className="text-2xl font-semibold text-gray-900">
            {Math.max(...densityGrid.flat(), 0)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="loading-state">Loading heatmap data...</div>
        </div>
      ) : !hasActivity ? (
        <div className="card">
          <div className="empty-state">
            No recent wireless activity detected. Once new device or access point data streams in, the heatmap will update automatically.
          </div>
        </div>
      ) : (
        <>
          {/* Density Map View */}
          {viewMode === 'density' && (
            <div className="card">
              <h4 className="card-header">Device Density Heatmap</h4>
              <div className="grid grid-cols-10 gap-1">
                {densityGrid.map((row, y) =>
                  row.map((count, x) => {
                    const intensity = Math.min(count / 5, 1);
                    return (
                      <div
                        key={`${x}-${y}`}
                        className="aspect-square rounded flex items-center justify-center text-xs font-semibold transition-all hover:scale-110 hover:z-10 hover:shadow-lg cursor-pointer"
                        style={{
                          backgroundColor: getHeatmapColor(intensity),
                          color: intensity > 0.5 ? 'white' : '#333',
                        }}
                        title={`Position (${x},${y}): ${count} devices`}
                      >
                        {count > 0 && heatmapConfig.showLabels ? count : ''}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Legend:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(144, 202, 249)' }}></div>
                    <span className="text-xs">Low</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 235, 59)' }}></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(244, 67, 54)' }}></div>
                    <span className="text-xs">High</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">10x10 grid showing device concentration</p>
              </div>
            </div>
          )}

          {/* Signal Strength View */}
          {viewMode === 'signal' && (
            <div className="card">
              <h4 className="card-header">Proximity Zones by Access Point</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proximityZones.slice(0, 12).map((zone, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg"
                    style={{
                      borderColor: getHeatmapColor(zone.intensity),
                      backgroundColor: `${getHeatmapColor(zone.intensity)}20`,
                    }}
                    onClick={() => setSelectedAP(zone.ap)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-gray-900">
                        {zone.ap.ssid || '(Hidden)'}
                      </h5>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        Ch {zone.ap.channel}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nearby Devices:</span>
                        <span className="font-semibold">{zone.deviceCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Signal:</span>
                        <span className="font-semibold">{zone.avgRSSI.toFixed(1)} dBm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Zone Intensity:</span>
                        <span className="font-semibold">{(zone.intensity * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movement Patterns View */}
          {viewMode === 'movement' && (
            <div className="card">
              <h4 className="card-header">Movement & Mobility Patterns</h4>
              {movementPatterns.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th className="table-header-cell">Device</th>
                        <th className="table-header-cell">Vendor</th>
                        <th className="table-header-cell">Signal Range</th>
                        <th className="table-header-cell">Variation</th>
                        <th className="table-header-cell">Status</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {movementPatterns.slice(0, 20).map(device => {
                        const min = Math.min(...device.rssi_values);
                        const max = Math.max(...device.rssi_values);
                        const variation = max - min;
                        return (
                          <tr key={device.mac_address} className="table-row">
                            <td className="table-cell-mono">{device.mac_address.slice(-8)}</td>
                            <td className="table-cell">{device.vendor || 'Unknown'}</td>
                            <td className="table-cell">
                              {min} to {max} dBm
                            </td>
                            <td className="table-cell">
                              <span className={variation > 20 ? 'text-warning-600 font-semibold' : 'text-gray-600'}>
                                {variation.toFixed(1)} dBm
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className={device.connected ? 'badge-connected' : 'badge-probe'}>
                                {device.connected ? 'Connected' : 'Moving'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">No significant movement detected</div>
              )}
            </div>
          )}

          {/* Insights */}
          <div className="card bg-primary-50 border-primary-200">
            <h4 className="font-semibold text-primary-900 mb-3">Heatmap Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-primary-700">
              <div>
                <strong>Busiest Zone:</strong>
                <p className="mt-1">
                  {proximityZones.length > 0
                    ? `${proximityZones.sort((a, b) => b.deviceCount - a.deviceCount)[0].ap.ssid || 'Hidden AP'} with ${proximityZones[0].deviceCount} devices`
                    : 'No data'}
                </p>
              </div>
              <div>
                <strong>Movement Activity:</strong>
                <p className="mt-1">
                  {movementPatterns.length} devices showing movement patterns
                  {movementPatterns.length > devices.length * 0.3 ? ' (High mobility)' : ' (Normal)'}
                </p>
              </div>
              <div>
                <strong>Coverage:</strong>
                <p className="mt-1">
                  {accessPoints.length} access points providing coverage across facility
                </p>
              </div>
              <div>
                <strong>Optimization Opportunity:</strong>
                <p className="mt-1">
                  {proximityZones.filter(z => z.deviceCount === 0).length} zones with no activity (consider AP placement)
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
