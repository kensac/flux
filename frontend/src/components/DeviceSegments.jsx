import { useState, useEffect, useMemo } from 'react';
import { Users, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { apiService } from '../services/api';

export default function DeviceSegments({ onResultsChange }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('vendor');

  // Fetch devices
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const devicesData = await apiService.getDevices(500);
      setDevices(devicesData || []);
      if (onResultsChange) {
        onResultsChange({ devices: devicesData, segment: selectedSegment });
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Segment: Vendor Distribution
  const vendorSegments = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const vendorCounts = devices.reduce((acc, device) => {
      const vendor = device.vendor || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(vendorCounts)
      .map(([vendor, count]) => ({
        name: vendor,
        value: count,
        percentage: ((count / devices.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [devices]);

  // Segment: Connection Status
  const connectionSegments = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const connected = devices.filter(d => d.connected).length;
    const probing = devices.length - connected;

    return [
      { name: 'Connected', value: connected, color: '#16a34a' },
      { name: 'Probing', value: probing, color: '#737373' },
    ];
  }, [devices]);

  // Segment: Signal Strength
  const signalSegments = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const getAvgRSSI = (rssiValues) => {
      if (!rssiValues || rssiValues.length === 0) return null;
      return rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
    };

    const segments = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      unknown: 0
    };

    devices.forEach(device => {
      const avgRSSI = getAvgRSSI(device.rssi_values);
      if (avgRSSI === null) {
        segments.unknown++;
      } else if (avgRSSI >= -50) {
        segments.excellent++;
      } else if (avgRSSI >= -65) {
        segments.good++;
      } else if (avgRSSI >= -75) {
        segments.fair++;
      } else {
        segments.poor++;
      }
    });

    return [
      { name: 'Excellent (> -50 dBm)', value: segments.excellent, color: '#16a34a' },
      { name: 'Good (-50 to -65 dBm)', value: segments.good, color: '#22c55e' },
      { name: 'Fair (-65 to -75 dBm)', value: segments.fair, color: '#f59e0b' },
      { name: 'Poor (< -75 dBm)', value: segments.poor, color: '#ef4444' },
      { name: 'Unknown', value: segments.unknown, color: '#737373' },
    ].filter(s => s.value > 0);
  }, [devices]);

  // Segment: Activity Level
  const activitySegments = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const segments = {
      'Very High (>5000)': 0,
      'High (1000-5000)': 0,
      'Medium (100-1000)': 0,
      'Low (<100)': 0,
    };

    devices.forEach(device => {
      const packets = device.packet_count || 0;
      if (packets > 5000) {
        segments['Very High (>5000)']++;
      } else if (packets >= 1000) {
        segments['High (1000-5000)']++;
      } else if (packets >= 100) {
        segments['Medium (100-1000)']++;
      } else {
        segments['Low (<100)']++;
      }
    });

    return Object.entries(segments)
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0);
  }, [devices]);

  // Segment: Data Usage
  const dataUsageSegments = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const segments = {
      'Heavy (>10MB)': 0,
      'Medium (1-10MB)': 0,
      'Light (<1MB)': 0,
      'None': 0,
    };

    devices.forEach(device => {
      const bytes = device.data_bytes || 0;
      const mb = bytes / (1024 * 1024);
      if (mb > 10) {
        segments['Heavy (>10MB)']++;
      } else if (mb >= 1) {
        segments['Medium (1-10MB)']++;
      } else if (mb > 0) {
        segments['Light (<1MB)']++;
      } else {
        segments['None']++;
      }
    });

    return Object.entries(segments)
      .map(([name, value]) => ({ name, value }))
      .filter(s => s.value > 0);
  }, [devices]);

  const segments = [
    { id: 'vendor', label: 'Vendor Distribution', data: vendorSegments },
    { id: 'connection', label: 'Connection Status', data: connectionSegments },
    { id: 'signal', label: 'Signal Strength', data: signalSegments },
    { id: 'activity', label: 'Activity Level', data: activitySegments },
    { id: 'data', label: 'Data Usage', data: dataUsageSegments },
  ];

  const currentSegment = segments.find(s => s.id === selectedSegment);

  const COLORS = ['#0284c7', '#16a34a', '#f59e0b', '#ef4444', '#737373', '#0ea5e9', '#22c55e', '#d97706', '#dc2626', '#525252'];

  return (
    <div>
      {loading ? (
        <div className="loading-state">Loading segments...</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Device Segmentation Analysis</h3>
            </div>
            <span className="text-sm text-gray-500">
              Analyzing {devices.length} devices
            </span>
          </div>

          {/* Segment Selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {segments.map(seg => (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedSegment === seg.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {seg.label}
              </button>
            ))}
          </div>

          {/* Visualization */}
          {currentSegment && currentSegment.data.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="card">
                <h4 className="card-header">
                  <PieChartIcon className="card-header-icon" />
                  Distribution Chart
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={currentSegment.data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => {
                        const total = currentSegment.data.reduce((sum, item) => sum + item.value, 0);
                        const percent = ((value / total) * 100).toFixed(0);
                        return `${percent}%`;
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {currentSegment.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart */}
              <div className="card">
                <h4 className="card-header">
                  Count by Segment
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentSegment.data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis
                      dataKey="name"
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} name="Device Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="card lg:col-span-2">
                <h4 className="card-header">Segment Details</h4>
                <div className="table-container">
                  <table className="table">
                    <thead className="table-head">
                      <tr>
                        <th className="table-header-cell">Segment</th>
                        <th className="table-header-cell">Device Count</th>
                        <th className="table-header-cell">Percentage</th>
                        <th className="table-header-cell">Visual</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {currentSegment.data.map((item, index) => {
                        const total = currentSegment.data.reduce((sum, i) => sum + i.value, 0);
                        const percentage = ((item.value / total) * 100).toFixed(1);
                        return (
                          <tr key={index} className="table-row">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                                ></div>
                                {item.name}
                              </div>
                            </td>
                            <td className="table-cell">{item.value.toLocaleString()}</td>
                            <td className="table-cell">{percentage}%</td>
                            <td className="table-cell">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    width: `${percentage}%`,
                                    backgroundColor: item.color || COLORS[index % COLORS.length]
                                  }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">No segment data available</div>
          )}
        </>
      )}
    </div>
  );
}
