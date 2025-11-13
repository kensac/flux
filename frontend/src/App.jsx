import { useState, useEffect, useCallback } from 'react';
import { Radio, RefreshCw, Building2, Download, Database } from 'lucide-react';
import { apiService } from './services/api';
import StatsCard from './components/StatsCard';
import DeviceTable from './components/DeviceTable';
import AccessPointTable from './components/AccessPointTable';
import MetricsChart from './components/MetricsChart';
import ChannelHoppingControl from './components/ChannelHoppingControl';
import NetworkInsights from './components/NetworkInsights';
import NetworkAnalytics from './components/NetworkAnalytics';
import TimeRangeSelector from './components/TimeRangeSelector';
import OccupancyIntelligence from './components/OccupancyIntelligence';
import AnomalyDetection from './components/AnomalyDetection';
import ActivityHeatmap from './components/ActivityHeatmap';
import BusinessIntelligence from './components/BusinessIntelligence';
import MACFilter from './components/MACFilter';

function App() {
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [accessPoints, setAccessPoints] = useState([]);
  const [metricsHistory, setMetricsHistory] = useState(null);
  const [loading, setLoading] = useState({
    stats: true,
    devices: true,
    accessPoints: true,
    metrics: true,
  });
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');

  // MAC filter handler
  const handleFilterChange = useCallback((filtered) => {
    setFilteredDevices(filtered);
  }, []);

  // Fetch all data
  const fetchData = async () => {
    try {
      // Fetch stats
      setLoading(prev => ({ ...prev, stats: true }));
      const statsData = await apiService.getStats();
      setStats(statsData);
      setLoading(prev => ({ ...prev, stats: false }));

      // Fetch active devices
      setLoading(prev => ({ ...prev, devices: true }));
      const devicesData = await apiService.getActiveDevices(5);
      setDevices(devicesData || []);
      setLoading(prev => ({ ...prev, devices: false }));

      // Fetch access points
      setLoading(prev => ({ ...prev, accessPoints: true }));
      const apsData = await apiService.getAccessPoints(50);
      setAccessPoints(apsData || []);
      setLoading(prev => ({ ...prev, accessPoints: false }));

      // Fetch metrics history based on time range
      setLoading(prev => ({ ...prev, metrics: true }));
      const tierMap = {
        '1h': { tier: '1m', limit: 60 },
        '6h': { tier: '1m', limit: 360 },
        '24h': { tier: '1h', limit: 24 },
        '7d': { tier: '1h', limit: 168 },
        '30d': { tier: '1h', limit: 720 },
      };
      const metricsData = await apiService.getMetricsHistory(tierMap[timeRange]);
      setMetricsHistory(metricsData);
      setLoading(prev => ({ ...prev, metrics: false }));

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading({
        stats: false,
        devices: false,
        accessPoints: false,
        metrics: false,
      });
    }
  };

  // Initial load
  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-inner">
            <div className="app-header-branding">
              <Radio className="app-header-logo" />
              <div className="app-header-titles">
                <h1 className="app-header-title">Flux WiFi Sniffer</h1>
                <p className="app-header-subtitle">Real-time Network Monitoring Dashboard</p>
              </div>
            </div>
            <div className="app-header-actions">
              <div className="app-header-meta">
                {lastUpdated && (
                  <p className="last-updated-text">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
                <div className="auto-refresh-controls">
                  <span className="auto-refresh-label">Auto-refresh:</span>
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`toggle-switch ${autoRefresh ? 'toggle-switch-active' : 'toggle-switch-inactive'}`}
                  >
                    <span
                      className={`toggle-switch-knob ${
                        autoRefresh ? 'toggle-switch-knob-active' : 'toggle-switch-knob-inactive'
                      }`}
                    />
                  </button>
                </div>
              </div>
              <a href="/app/data-platform" className="btn btn-secondary btn-with-icon">
                <Database className="icon-sm" />
                Data Platform
              </a>
              <a href="/app/operations" className="btn btn-secondary btn-with-icon">
                <Building2 className="icon-sm" />
                Operations
              </a>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify({
                    stats,
                    devices,
                    accessPoints,
                    metrics: metricsHistory,
                    exported_at: new Date().toISOString()
                  }, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `network-data-${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn btn-secondary btn-icon"
              >
                <Download className="icon-sm" />
                Export
              </button>
              <button
                onClick={fetchData}
                className="btn btn-primary btn-icon"
              >
                <RefreshCw className="icon-sm" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Stats Cards */}
        <StatsCard stats={stats} loading={loading.stats} />

        {/* Network Insights */}
        <div className="section-spacing">
          <NetworkInsights data={metricsHistory} stats={stats} />
        </div>

        {/* Time Range Selector */}
        <div className="section-spacing flex items-center justify-between">
          <TimeRangeSelector
            selectedRange={timeRange}
            onRangeChange={(range) => setTimeRange(range.value)}
          />
        </div>

        {/* Metrics Chart */}
        <div className="section-spacing">
          <MetricsChart data={metricsHistory} loading={loading.metrics} />
        </div>

        {/* Business Intelligence & ROI */}
        <div className="section-spacing">
          <BusinessIntelligence data={metricsHistory} stats={stats} />
        </div>

        {/* Occupancy Intelligence */}
        <div className="section-spacing">
          <OccupancyIntelligence data={metricsHistory} stats={stats} />
        </div>

        {/* Anomaly Detection */}
        <div className="section-spacing">
          <AnomalyDetection
            data={metricsHistory}
            devices={devices}
            accessPoints={accessPoints}
          />
        </div>

        {/* Activity Heatmap */}
        <div className="section-spacing">
          <ActivityHeatmap data={metricsHistory} />
        </div>

        {/* Network Analytics */}
        <div className="section-spacing">
          <NetworkAnalytics devices={devices} accessPoints={accessPoints} />
        </div>

        {/* Channel Hopping Control */}
        <div className="section-spacing">
          <ChannelHoppingControl />
        </div>

        {/* MAC Address Filter */}
        <div className="section-spacing">
          <MACFilter devices={devices} onFilterChange={handleFilterChange} />
        </div>

        {/* Devices Table */}
        <div className="section-spacing">
          <DeviceTable
            devices={filteredDevices.length > 0 ? filteredDevices : devices}
            loading={loading.devices}
          />
        </div>

        {/* Access Points Table */}
        <div className="section-spacing">
          <AccessPointTable accessPoints={accessPoints} loading={loading.accessPoints} />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-content">
          <p className="app-footer-text">
            Flux WiFi Sniffer Dashboard - Monitoring {stats?.total_devices || 0} devices and{' '}
            {stats?.total_aps || 0} access points
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
