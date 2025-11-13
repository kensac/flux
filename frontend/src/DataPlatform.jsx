import { useState, useEffect } from 'react';
import { Database, RefreshCw, Download, Radio } from 'lucide-react';
import { apiService } from './services/api';
import QueryBuilder from './components/QueryBuilder';
import EventsExplorer from './components/EventsExplorer';
import SavedQueries from './components/SavedQueries';
import DeviceSegments from './components/DeviceSegments';
import TimeSeriesExplorer from './components/TimeSeriesExplorer';
import MongoQueryEditor from './components/MongoQueryEditor';
import DashboardBuilder from './components/DashboardBuilder';
import ProximityHeatmap from './components/ProximityHeatmap';

function DataPlatform() {
  const [activeTab, setActiveTab] = useState('explorer');
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [currentQuery, setCurrentQuery] = useState(null);

  // Fetch initial stats
  const fetchStats = async () => {
    try {
      const statsData = await apiService.getStats();
      setStats(statsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle query execution from QueryBuilder or SavedQueries
  const handleQueryExecute = async (query) => {
    setCurrentQuery(query);
    // Switch to explorer tab to show results
    setActiveTab('explorer');
  };

  // Export current view data
  const handleExport = () => {
    const exportData = {
      query: currentQuery,
      results: queryResults,
      timestamp: new Date().toISOString(),
      stats: stats
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wifi-data-export-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'explorer', label: 'Events Explorer', description: 'Browse and filter WiFi events in real-time' },
    { id: 'queries', label: 'Saved Queries', description: 'Pre-built queries and custom saved queries' },
    { id: 'mongo', label: 'MongoDB Query', description: 'Write custom MongoDB queries with full syntax' },
    { id: 'heatmap', label: 'Proximity Heatmap', description: 'Distance-based density and movement visualization' },
    { id: 'dashboards', label: 'Custom Dashboards', description: 'Build and save custom visualizations' },
    { id: 'segments', label: 'Device Segments', description: 'Analyze device cohorts and groups' },
    { id: 'timeseries', label: 'Time Series', description: 'Advanced time-series analysis and trends' },
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-content">
          <div className="app-header-inner">
            <div className="app-header-branding">
              <Database className="app-header-logo" />
              <div className="app-header-titles">
                <h1 className="app-header-title">WiFi Data Platform</h1>
                <p className="app-header-subtitle">Query, analyze, and explore your WiFi sniffer data</p>
              </div>
            </div>
            <div className="app-header-actions">
              <div className="app-header-meta">
                {lastUpdated && (
                  <p className="last-updated-text">
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
              <a href="/app" className="btn btn-secondary btn-with-icon">
                <Radio className="icon-sm" />
                Dashboard
              </a>
              <button
                onClick={handleExport}
                className="btn btn-secondary btn-icon"
                disabled={!queryResults}
              >
                <Download className="icon-sm" />
                Export
              </button>
              <button
                onClick={fetchStats}
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
        {/* Stats Overview */}
        {stats && (
          <div className="section-spacing">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-info">
                    <p className="stat-card-label">Total Events</p>
                    <p className="stat-card-value">{(stats.total_devices + stats.total_aps).toLocaleString()}</p>
                  </div>
                  <Database className="stat-card-icon" />
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-info">
                    <p className="stat-card-label">Devices Tracked</p>
                    <p className="stat-card-value">{stats.total_devices.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-info">
                    <p className="stat-card-label">Access Points</p>
                    <p className="stat-card-value">{stats.total_aps.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-content">
                  <div className="stat-card-info">
                    <p className="stat-card-label">Active Now</p>
                    <p className="stat-card-value">{stats.active_devices.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Query Builder */}
        <div className="section-spacing">
          <QueryBuilder
            onQueryExecute={handleQueryExecute}
            externalQuery={currentQuery}
          />
        </div>

        {/* Tab Navigation */}
        <div className="section-spacing">
          <div className="card">
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[200px] px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    activeTab === tab.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{tab.label}</div>
                  <div className="text-xs text-gray-600">{tab.description}</div>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'explorer' && (
                <EventsExplorer
                  currentQuery={currentQuery}
                  onResultsChange={setQueryResults}
                />
              )}
              {activeTab === 'queries' && (
                <SavedQueries
                  onQuerySelect={handleQueryExecute}
                  onResultsChange={setQueryResults}
                />
              )}
              {activeTab === 'mongo' && (
                <MongoQueryEditor
                  onQueryExecute={handleQueryExecute}
                  onResultsChange={setQueryResults}
                />
              )}
              {activeTab === 'heatmap' && (
                <ProximityHeatmap />
              )}
              {activeTab === 'dashboards' && (
                <DashboardBuilder />
              )}
              {activeTab === 'segments' && (
                <DeviceSegments
                  onResultsChange={setQueryResults}
                />
              )}
              {activeTab === 'timeseries' && (
                <TimeSeriesExplorer
                  currentQuery={currentQuery}
                  onResultsChange={setQueryResults}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-footer-content">
          <p className="app-footer-text">
            WiFi Data Platform - Query and analyze {stats?.total_devices || 0} devices across {stats?.total_aps || 0} access points
          </p>
        </div>
      </footer>
    </div>
  );
}

export default DataPlatform;
