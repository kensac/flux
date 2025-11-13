import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { apiService } from '../services/api';
import { format, subHours, subDays } from 'date-fns';

export default function TimeSeriesExplorer({ currentQuery, onResultsChange }) {
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [metricType, setMetricType] = useState('devices');
  const [chartType, setChartType] = useState('line');
  const [aggregation, setAggregation] = useState('1h');

  // Fetch time-series data
  const durationMinutesMap = {
    '1h': 60,
    '6h': 360,
    '24h': 1440,
    '7d': 10080,
    '30d': 43200,
  };

  const aggregationMinutesMap = {
    '1m': 1,
    '5m': 5,
    '1h': 60,
  };

  const buildFallbackSnapshot = async () => {
    const [statsData, activeDevices, aps] = await Promise.all([
      apiService.getStats(),
      apiService.getActiveDevices(15),
      apiService.getAccessPoints(100),
    ]);

    const deviceMetrics = (activeDevices || []).slice(0, 50).map(device => {
      const values = device.rssi_values || [];
      const avg = values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      return {
        mac_address: device.mac_address,
        rssi_avg: avg,
        rssi_min: min,
        rssi_max: max,
        packet_count: device.packet_count || 0,
        data_bytes: device.data_bytes || 0,
        connected: !!device.connected,
        vendor: device.vendor || 'Unknown',
      };
    });

    const apMetrics = (aps || []).slice(0, 50).map(ap => {
      const values = ap.rssi_values || [];
      const avg = values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      return {
        bssid: ap.bssid,
        ssid: ap.ssid,
        rssi_avg: avg,
        rssi_min: min,
        rssi_max: max,
        beacon_count: ap.beacon_count || 0,
        channel: ap.channel || 0,
      };
    });

    return {
      tier: aggregation,
      snapshots: [
        {
          timestamp: new Date().toISOString(),
          tier: aggregation,
          devices: {
            total: statsData?.total_devices ?? activeDevices.length,
            active: statsData?.active_devices ?? activeDevices.length,
            connected: activeDevices.filter(device => device.connected).length,
          },
          access_points: {
            total: statsData?.total_aps ?? aps.length,
            active: statsData?.active_aps ?? aps.length,
          },
          device_metrics: deviceMetrics,
          ap_metrics: apMetrics,
        },
      ],
      fallback: true,
    };
  };

  const fetchMetrics = async () => {
    try {
      setLoading(true);

      const durationMinutes = durationMinutesMap[timeRange] || 1440;
      const aggMinutes = aggregationMinutesMap[aggregation] || 60;
      const limit = Math.min(1000, Math.max(24, Math.ceil(durationMinutes / aggMinutes)));
      const end = new Date();
      const start = new Date(end.getTime() - durationMinutes * 60000);

      const params = {
        tier: aggregation,
        start: start.toISOString(),
        end: end.toISOString(),
        limit,
      };

      const data = await apiService.getMetricsHistory(params);
      if (!data || !data.snapshots || data.snapshots.length === 0) {
        const fallback = await buildFallbackSnapshot();
        setMetricsData(fallback);
        if (onResultsChange) {
          onResultsChange({ metrics: fallback, timeRange, metricType });
        }
        return;
      }

      setMetricsData(data);
      if (onResultsChange) {
        onResultsChange({ metrics: data, timeRange, metricType });
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange, aggregation]);

  // Format chart data
  const chartData = useMemo(() => {
    if (!metricsData || !metricsData.snapshots) return [];

    return metricsData.snapshots
      .map(snapshot => {
        const timestamp = new Date(snapshot.timestamp);
        return {
          timestamp: timestamp.getTime(),
          time: format(timestamp, timeRange === '24h' || timeRange === '1h' || timeRange === '6h' ? 'HH:mm' : 'MM/dd HH:mm'),
          fullTime: format(timestamp, 'PPp'),
          // Device metrics
          totalDevices: snapshot.devices.total,
          activeDevices: snapshot.devices.active,
          connectedDevices: snapshot.devices.connected,
          // AP metrics
          totalAPs: snapshot.access_points.total,
          activeAPs: snapshot.access_points.active,
          // Calculate averages
          avgRSSI: snapshot.device_metrics && snapshot.device_metrics.length > 0
            ? snapshot.device_metrics.reduce((sum, d) => sum + (d.rssi_avg || 0), 0) / snapshot.device_metrics.length
            : 0,
          totalPackets: snapshot.device_metrics
            ? snapshot.device_metrics.reduce((sum, d) => sum + (d.packet_count || 0), 0)
            : 0,
          totalBytes: snapshot.device_metrics
            ? snapshot.device_metrics.reduce((sum, d) => sum + (d.data_bytes || 0), 0)
            : 0,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [metricsData, timeRange]);

  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (chartData.length < 2) return null;

    const first = chartData[0];
    const last = chartData[chartData.length - 1];

    const deviceChange = last.activeDevices - first.activeDevices;
    const devicePercentChange = first.activeDevices > 0
      ? ((deviceChange / first.activeDevices) * 100).toFixed(1)
      : 0;

    const apChange = last.activeAPs - first.activeAPs;
    const apPercentChange = first.activeAPs > 0
      ? ((apChange / first.activeAPs) * 100).toFixed(1)
      : 0;

    const avgDevices = chartData.reduce((sum, d) => sum + d.activeDevices, 0) / chartData.length;
    const avgAPs = chartData.reduce((sum, d) => sum + d.activeAPs, 0) / chartData.length;

    const maxDevices = Math.max(...chartData.map(d => d.activeDevices));
    const minDevices = Math.min(...chartData.map(d => d.activeDevices));

    return {
      deviceChange,
      devicePercentChange,
      apChange,
      apPercentChange,
      avgDevices: avgDevices.toFixed(0),
      avgAPs: avgAPs.toFixed(0),
      maxDevices,
      minDevices,
      totalDataPoints: chartData.length
    };
  }, [chartData]);

  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  const metricTypes = [
    { value: 'devices', label: 'Devices', color: '#0284c7' },
    { value: 'aps', label: 'Access Points', color: '#16a34a' },
    { value: 'traffic', label: 'Traffic', color: '#f59e0b' },
    { value: 'signal', label: 'Signal Quality', color: '#ef4444' },
  ];

  const renderChart = () => {
    const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
    const DataComponent = chartType === 'area' ? Area : Line;

    let datasets = [];

    switch (metricType) {
      case 'devices':
        datasets = [
          { key: 'activeDevices', name: 'Active Devices', color: '#0284c7' },
          { key: 'connectedDevices', name: 'Connected Devices', color: '#16a34a' },
          { key: 'totalDevices', name: 'Total Devices', color: '#737373' },
        ];
        break;
      case 'aps':
        datasets = [
          { key: 'activeAPs', name: 'Active APs', color: '#16a34a' },
          { key: 'totalAPs', name: 'Total APs', color: '#737373' },
        ];
        break;
      case 'traffic':
        datasets = [
          { key: 'totalPackets', name: 'Total Packets', color: '#f59e0b' },
          { key: 'totalBytes', name: 'Total Bytes', color: '#dc2626' },
        ];
        break;
      case 'signal':
        datasets = [
          { key: 'avgRSSI', name: 'Avg RSSI (dBm)', color: '#ef4444' },
        ];
        break;
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="time"
            stroke="#737373"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#737373"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullTime;
              }
              return label;
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
          {datasets.map(dataset => (
            <DataComponent
              key={dataset.key}
              type="monotone"
              dataKey={dataset.key}
              stroke={dataset.color}
              fill={chartType === 'area' ? dataset.color : undefined}
              fillOpacity={chartType === 'area' ? 0.6 : undefined}
              strokeWidth={2.5}
              name={dataset.name}
              dot={false}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      {loading ? (
        <div className="loading-state">Loading time-series data...</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Time Series Analysis</h3>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-500">
            {chartData.length} data points
            {metricsData?.fallback && ' (real-time snapshot)'}
          </span>
        </div>
      </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="form-field">
              <label className="form-label">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input"
              >
                {timeRanges.map(tr => (
                  <option key={tr.value} value={tr.value}>{tr.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Metric Type</label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className="input"
              >
                {metricTypes.map(mt => (
                  <option key={mt.value} value={mt.value}>{mt.label}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Chart Type</label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="input"
              >
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Aggregation</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                className="input"
              >
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="1h">1 Hour</option>
              </select>
            </div>
          </div>

          {/* Trend Statistics */}
          {trendStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="card p-4">
                <p className="text-xs text-gray-500 mb-1">Avg Active Devices</p>
                <p className="text-2xl font-semibold text-gray-900">{trendStats.avgDevices}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-500 mb-1">Device Change</p>
                <p className={`text-2xl font-semibold ${trendStats.deviceChange >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                  {trendStats.deviceChange >= 0 ? '+' : ''}{trendStats.deviceChange}
                  <span className="text-sm ml-1">({trendStats.devicePercentChange}%)</span>
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-500 mb-1">Peak Devices</p>
                <p className="text-2xl font-semibold text-gray-900">{trendStats.maxDevices}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-500 mb-1">Minimum Devices</p>
                <p className="text-2xl font-semibold text-gray-900">{trendStats.minDevices}</p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="card">
            <h4 className="card-header">
              {metricTypes.find(mt => mt.value === metricType)?.label} Over Time
            </h4>
            {chartData.length > 0 ? (
              renderChart()
            ) : (
              <div className="empty-state">No time-series data available</div>
            )}
          </div>

          {/* Data Summary Table */}
          {chartData.length > 0 && (
            <div className="card mt-6">
              <h4 className="card-header">Recent Data Points</h4>
              <div className="table-container">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header-cell">Time</th>
                      <th className="table-header-cell">Active Devices</th>
                      <th className="table-header-cell">Connected</th>
                      <th className="table-header-cell">Active APs</th>
                      <th className="table-header-cell">Avg RSSI</th>
                      <th className="table-header-cell">Total Packets</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {chartData.slice(-10).reverse().map((point, idx) => (
                      <tr key={idx} className="table-row">
                        <td className="table-cell-muted">{point.fullTime}</td>
                        <td className="table-cell">{point.activeDevices}</td>
                        <td className="table-cell">{point.connectedDevices}</td>
                        <td className="table-cell">{point.activeAPs}</td>
                        <td className="table-cell">
                          <span className={point.avgRSSI >= -50 ? 'signal-excellent' : point.avgRSSI >= -70 ? 'signal-good' : 'signal-weak'}>
                            {point.avgRSSI.toFixed(1)} dBm
                          </span>
                        </td>
                        <td className="table-cell">{point.totalPackets.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
