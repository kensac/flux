import { useState, useEffect } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { apiService } from './services/api';
import StatsCard from './components/StatsCard';
import DeviceTable from './components/DeviceTable';
import AccessPointTable from './components/AccessPointTable';
import MetricsChart from './components/MetricsChart';
import ChannelHoppingControl from './components/ChannelHoppingControl';

function App() {
  const [stats, setStats] = useState(null);
  const [devices, setDevices] = useState([]);
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

      // Fetch metrics history
      setLoading(prev => ({ ...prev, metrics: true }));
      const metricsData = await apiService.getMetricsHistory({
        tier: '1m',
        limit: 60,
      });
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
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

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

        {/* Metrics Chart */}
        <div className="section-spacing">
          <MetricsChart data={metricsHistory} loading={loading.metrics} />
        </div>

        {/* Channel Hopping Control */}
        <div className="section-spacing">
          <ChannelHoppingControl />
        </div>

        {/* Devices Table */}
        <div className="section-spacing">
          <DeviceTable devices={devices} loading={loading.devices} />
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
