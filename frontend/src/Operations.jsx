import { useState, useEffect } from 'react';
import { Building2, RefreshCw, ArrowLeft, Download, Database } from 'lucide-react';
import { apiService } from './services/api';
import OperationsStatus from './components/OperationsStatus';
import EnergyOptimization from './components/EnergyOptimization';
import SmartAutomation from './components/SmartAutomation';
import FacilitiesROI from './components/FacilitiesROI';
import HVACManagement from './components/HVACManagement';
import LightingManagement from './components/LightingManagement';
import JanitorialServices from './components/JanitorialServices';
import SecurityMonitoring from './components/SecurityMonitoring';
import TotalCostImpact from './components/TotalCostImpact';

export default function Operations() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [operationsConfig, setOperationsConfig] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      // Fetch active devices 
      const devicesData = await apiService.getActiveDevices(5);
      
      // Fetch config 
      const configData = await apiService.getOperationsConfig();
      
      // Fetch historical metrics for cost calculations
      const metricsData = await apiService.getMetricsHistory({
        tier: '1h',
        start: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
        end: new Date().toISOString(),
        limit: 1000
      });
      
      // Transform to stats object 
      const transformedStats = {
        devices: {
          active: devicesData.length || 0,
          list: devicesData // Keep full list if needed
        }
      };
      
      setStats(transformedStats);
      setOperationsConfig(configData);
      setHistoricalData(metricsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching operations data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-inner">
            <div className="app-header-branding">
              <Building2 className="app-header-icon" />
              <div className="app-header-titles">
                <h1 className="app-header-title">Flux Operations Dashboard</h1>
                <p className="app-header-subtitle">Building Management & Cost Analytics</p>
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
                onClick={() => {
                  const dataStr = JSON.stringify({
                    stats,
                    config: operationsConfig,
                    historicalData,
                    exported_at: new Date().toISOString()
                  }, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `operations-data-${Date.now()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="btn btn-secondary btn-icon"
              >
                <Download className="icon-sm" />
                Export
              </button>
              <a href="/app/data-platform" className="btn btn-secondary btn-with-icon">
                <Database className="icon-sm" />
                Data Platform
              </a>
              <a href="/app/" className="btn btn-secondary btn-with-icon">
                <ArrowLeft className="icon-sm" />
                Main Dashboard
              </a>
              <button
                onClick={handleRefresh}
                className="btn btn-primary btn-with-icon"
                disabled={loading}
              >
                <RefreshCw className={`icon-sm ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Current Occupancy Status */}
        <OperationsStatus stats={stats} loading={loading} config={operationsConfig} />

        {/* Facilities ROI Calculator */}
        <div className="section-spacing">
          <FacilitiesROI stats={stats} historicalData={historicalData} />
        </div>

        {/* Energy Optimization */}
        <div className="section-spacing">
          <EnergyOptimization stats={stats} historicalData={historicalData} />
        </div>

        {/* Smart Automation */}
        <div className="section-spacing">
          <SmartAutomation stats={stats} />
        </div>

        {/* Total Cost Impact */}
        <div className="section-spacing">
          <TotalCostImpact historicalData={historicalData} config={operationsConfig} />
        </div>

        {/* HVAC Management */}
        <div className="section-spacing">
          <HVACManagement
            stats={stats}
            config={operationsConfig?.hvac}
            historicalData={historicalData}
            onConfigUpdate={fetchData}
          />
        </div>

        {/* Lighting Management */}
        <div className="section-spacing">
          <LightingManagement
            stats={stats}
            config={operationsConfig?.lighting}
            historicalData={historicalData}
            onConfigUpdate={fetchData}
          />
        </div>

        {/* Janitorial Services */}
        <div className="section-spacing">
          <JanitorialServices
            stats={stats}
            config={operationsConfig?.janitorial}
            historicalData={historicalData}
            onConfigUpdate={fetchData}
          />
        </div>

        {/* Security Monitoring */}
        <div className="section-spacing">
          <SecurityMonitoring
            stats={stats}
            config={operationsConfig?.security}
            historicalData={historicalData}
            onConfigUpdate={fetchData}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-content">
          <p className="app-footer-text">Flux WiFi Sniffer Operations Dashboard - Real-time building management analytics</p>
        </div>
      </footer>
    </div>
  );
}
