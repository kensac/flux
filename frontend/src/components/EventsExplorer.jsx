import { useState, useEffect, useMemo } from 'react';
import { Wifi, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '../services/api';
import { format } from 'date-fns';

export default function EventsExplorer({ currentQuery, onResultsChange }) {
  const [devices, setDevices] = useState([]);
  const [accessPoints, setAccessPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('devices'); // 'devices' or 'aps'
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Fetch data based on query
  const fetchData = async () => {
    try {
      setLoading(true);

      // Determine time range in minutes
      const timeRangeMap = {
        '5m': 5,
        '15m': 15,
        '1h': 60,
        '6h': 360,
        '24h': 1440,
        '7d': 10080,
        '30d': 43200,
        'all': undefined
      };

      const minutes = currentQuery?.timeRange
        ? timeRangeMap[currentQuery.timeRange]
        : 60;

      const limit = currentQuery?.limit || 100;

      // Fetch devices and APs
      const [devicesData, apsData] = await Promise.all([
        minutes ? apiService.getActiveDevices(minutes) : apiService.getDevices(limit),
        apiService.getAccessPoints(limit)
      ]);

      setDevices(devicesData || []);
      setAccessPoints(apsData || []);

      // Send results to parent (optional)
      if (onResultsChange) {
        onResultsChange({ devices: devicesData, accessPoints: apsData });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentQuery]);

  // Apply client-side filtering based on query
  const filteredDevices = useMemo(() => {
    if (!currentQuery?.filters || currentQuery.filters.length === 0) {
      return devices;
    }

    return devices.filter(device => {
      return currentQuery.filters.every(filter => {
        const value = device[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return String(value).toLowerCase() === String(filterValue).toLowerCase();
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filterValue);
          case 'less_than':
            return Number(value) < Number(filterValue);
          default:
            return true;
        }
      });
    });
  }, [devices, currentQuery]);

  const filteredAPs = useMemo(() => {
    if (!currentQuery?.filters || currentQuery.filters.length === 0) {
      return accessPoints;
    }

    return accessPoints.filter(ap => {
      return currentQuery.filters.every(filter => {
        const value = ap[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return String(value).toLowerCase() === String(filterValue).toLowerCase();
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filterValue);
          case 'less_than':
            return Number(value) < Number(filterValue);
          default:
            return true;
        }
      });
    });
  }, [accessPoints, currentQuery]);

  const toggleRowExpansion = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const calculateAvgRSSI = (rssiValues) => {
    if (!rssiValues || rssiValues.length === 0) return 'N/A';
    const avg = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
    return avg.toFixed(1);
  };

  const getSignalClass = (rssi) => {
    if (!rssi || rssi === 'N/A') return 'signal-unknown';
    const rssiNum = typeof rssi === 'string' ? parseFloat(rssi) : rssi;
    if (rssiNum >= -50) return 'signal-excellent';
    if (rssiNum >= -70) return 'signal-good';
    return 'signal-weak';
  };

  return (
    <div>
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('devices')}
          className={`btn ${viewMode === 'devices' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Activity className="icon-sm" />
          Devices ({filteredDevices.length})
        </button>
        <button
          onClick={() => setViewMode('aps')}
          className={`btn ${viewMode === 'aps' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Wifi className="icon-sm" />
          Access Points ({filteredAPs.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading data...</div>
      ) : (
        <>
          {/* Devices Table */}
          {viewMode === 'devices' && (
            <div className="table-container">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header-cell">Expand</th>
                    <th className="table-header-cell">MAC Address</th>
                    <th className="table-header-cell">Vendor</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Avg RSSI</th>
                    <th className="table-header-cell">Packets</th>
                    <th className="table-header-cell">Data (Bytes)</th>
                    <th className="table-header-cell">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        No devices found matching your query
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((device) => (
                      <>
                        <tr key={device.mac_address} className="table-row">
                          <td className="table-cell">
                            <button
                              onClick={() => toggleRowExpansion(device.mac_address)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {expandedRows.has(device.mac_address) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="table-cell-mono">{device.mac_address}</td>
                          <td className="table-cell">{device.vendor || 'Unknown'}</td>
                          <td className="table-cell">
                            <span className={device.connected ? 'badge-connected' : 'badge-probe'}>
                              {device.connected ? 'Connected' : 'Probing'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={getSignalClass(calculateAvgRSSI(device.rssi_values))}>
                              {calculateAvgRSSI(device.rssi_values)} dBm
                            </span>
                          </td>
                          <td className="table-cell">{device.packet_count?.toLocaleString() || 0}</td>
                          <td className="table-cell">{device.data_bytes?.toLocaleString() || 0}</td>
                          <td className="table-cell-muted">
                            {device.last_seen ? format(new Date(device.last_seen), 'PPp') : 'N/A'}
                          </td>
                        </tr>
                        {expandedRows.has(device.mac_address) && (
                          <tr>
                            <td colSpan="8" className="bg-gray-50 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold mb-2">Connection History</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>First Seen: {device.first_seen ? format(new Date(device.first_seen), 'PPp') : 'N/A'}</p>
                                    <p>Last Connected: {device.last_connected ? format(new Date(device.last_connected), 'PPp') : 'Never'}</p>
                                    <p>Last Disconnected: {device.last_disconnected ? format(new Date(device.last_disconnected), 'PPp') : 'Never'}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Probed Networks</h4>
                                  {device.probe_ssids && device.probe_ssids.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {device.probe_ssids.slice(0, 10).map((ssid, idx) => (
                                        <span key={idx} className="badge-channel text-xs">
                                          {ssid}
                                        </span>
                                      ))}
                                      {device.probe_ssids.length > 10 && (
                                        <span className="text-xs text-gray-500">
                                          +{device.probe_ssids.length - 10} more
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500">No probed networks</p>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Traffic Statistics</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>Data Frames: {device.data_frames?.toLocaleString() || 0}</p>
                                    <p>Total Packets: {device.packet_count?.toLocaleString() || 0}</p>
                                    <p>Total Data: {(device.data_bytes / 1024).toFixed(2)} KB</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Signal Strength</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>Average: {calculateAvgRSSI(device.rssi_values)} dBm</p>
                                    <p>Min: {device.rssi_values && device.rssi_values.length > 0 ? Math.min(...device.rssi_values) : 'N/A'} dBm</p>
                                    <p>Max: {device.rssi_values && device.rssi_values.length > 0 ? Math.max(...device.rssi_values) : 'N/A'} dBm</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Access Points Table */}
          {viewMode === 'aps' && (
            <div className="table-container">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header-cell">Expand</th>
                    <th className="table-header-cell">BSSID</th>
                    <th className="table-header-cell">SSID</th>
                    <th className="table-header-cell">Channel</th>
                    <th className="table-header-cell">Encryption</th>
                    <th className="table-header-cell">Avg RSSI</th>
                    <th className="table-header-cell">Beacons</th>
                    <th className="table-header-cell">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredAPs.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500">
                        No access points found matching your query
                      </td>
                    </tr>
                  ) : (
                    filteredAPs.map((ap) => (
                      <>
                        <tr key={ap.bssid} className="table-row">
                          <td className="table-cell">
                            <button
                              onClick={() => toggleRowExpansion(ap.bssid)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              {expandedRows.has(ap.bssid) ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="table-cell-mono">{ap.bssid}</td>
                          <td className="table-cell">{ap.ssid || '(Hidden)'}</td>
                          <td className="table-cell">
                            <span className="badge-channel">Ch {ap.channel}</span>
                          </td>
                          <td className="table-cell">
                            <span className={ap.encryption === 'Open' ? 'badge-open' : 'badge-secure'}>
                              {ap.encryption || 'Unknown'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={getSignalClass(calculateAvgRSSI(ap.rssi_values))}>
                              {calculateAvgRSSI(ap.rssi_values)} dBm
                            </span>
                          </td>
                          <td className="table-cell">{ap.beacon_count?.toLocaleString() || 0}</td>
                          <td className="table-cell-muted">
                            {ap.last_seen ? format(new Date(ap.last_seen), 'PPp') : 'N/A'}
                          </td>
                        </tr>
                        {expandedRows.has(ap.bssid) && (
                          <tr>
                            <td colSpan="8" className="bg-gray-50 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <h4 className="font-semibold mb-2">Network Information</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>BSSID: {ap.bssid}</p>
                                    <p>SSID: {ap.ssid || '(Hidden Network)'}</p>
                                    <p>Encryption: {ap.encryption || 'Unknown'}</p>
                                    <p>Channel: {ap.channel}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Activity</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>First Seen: {ap.first_seen ? format(new Date(ap.first_seen), 'PPp') : 'N/A'}</p>
                                    <p>Last Seen: {ap.last_seen ? format(new Date(ap.last_seen), 'PPp') : 'N/A'}</p>
                                    <p>Beacon Count: {ap.beacon_count?.toLocaleString() || 0}</p>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Signal Strength</h4>
                                  <div className="space-y-1 text-gray-700">
                                    <p>Average: {calculateAvgRSSI(ap.rssi_values)} dBm</p>
                                    <p>Min: {ap.rssi_values && ap.rssi_values.length > 0 ? Math.min(...ap.rssi_values) : 'N/A'} dBm</p>
                                    <p>Max: {ap.rssi_values && ap.rssi_values.length > 0 ? Math.max(...ap.rssi_values) : 'N/A'} dBm</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
