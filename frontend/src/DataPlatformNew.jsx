import { useState, useEffect } from 'react';
import {
  Database,
  Radio,
  Search,
  Bookmark,
  Code,
  Map,
  LayoutDashboard,
  Users,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { apiService } from './services/api';

// Import all feature components
import EventsExplorer from './components/EventsExplorer';
import SavedQueries from './components/SavedQueries';
import MongoQueryEditor from './components/MongoQueryEditor';
import ProximityHeatmap from './components/ProximityHeatmap';
import DashboardBuilder from './components/DashboardBuilder';
import DeviceSegments from './components/DeviceSegments';
import TimeSeriesExplorer from './components/TimeSeriesExplorer';
import QueryBuilder from './components/QueryBuilder';

function DataPlatform() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('explorer');
  const [stats, setStats] = useState(null);
  const [currentQuery, setCurrentQuery] = useState(null);
  const [viewResults, setViewResults] = useState({});

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await apiService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Navigation items
  const navigationItems = [
    {
      id: 'explorer',
      label: 'Events Explorer',
      icon: Search,
      description: 'Browse and filter WiFi events'
    },
    {
      id: 'saved-queries',
      label: 'Saved Queries',
      icon: Bookmark,
      description: 'Pre-built and custom queries'
    },
    {
      id: 'mongo-query',
      label: 'MongoDB Query',
      icon: Code,
      description: 'Custom MongoDB queries'
    },
    {
      id: 'heatmap',
      label: 'Proximity Heatmap',
      icon: Map,
      description: 'Density and movement visualization'
    },
    {
      id: 'dashboards',
      label: 'Custom Dashboards',
      icon: LayoutDashboard,
      description: 'Build custom visualizations'
    },
    {
      id: 'segments',
      label: 'Device Segments',
      icon: Users,
      description: 'Cohort analysis'
    },
    {
      id: 'timeseries',
      label: 'Time Series',
      icon: TrendingUp,
      description: 'Temporal analysis'
    },
  ];

  // Handle query execution from child components
  const handleQueryExecute = (query) => {
    setCurrentQuery(query);
  };

  const handleResultsUpdate = (viewId, data) => {
    setViewResults((prev) => ({
      ...prev,
      [viewId]: data,
    }));
  };

  // Render the active view's content
  const renderContent = () => {
    switch (activeView) {
      case 'explorer':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Events Explorer</h2>
              <p className="text-gray-600">Browse and filter WiFi device and access point events in real-time</p>
            </div>

            {/* Query Builder */}
            <div className="mb-6">
              <QueryBuilder
                onQueryExecute={(query) => handleQueryExecute(query)}
                externalQuery={currentQuery}
              />
            </div>

            {/* Events Table */}
            <div className="flex-1 overflow-hidden">
              <EventsExplorer currentQuery={currentQuery} />
            </div>
          </div>
        );

      case 'saved-queries':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Saved Queries</h2>
              <p className="text-gray-600">Pre-built queries for common analysis tasks and custom saved queries</p>
            </div>

            <div className="flex-1 overflow-auto">
              <SavedQueries
                onResultsChange={(results) => handleResultsUpdate('saved-queries', results)}
              />
            </div>
          </div>
        );

      case 'mongo-query':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">MongoDB Query Editor</h2>
              <p className="text-gray-600">Write custom MongoDB queries with full syntax support and security validation</p>
            </div>

            <div className="flex-1 overflow-hidden">
              <MongoQueryEditor />
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Proximity Heatmap</h2>
              <p className="text-gray-600">Visualize device density, signal zones, and movement patterns</p>
            </div>

            <div className="flex-1 overflow-auto">
              <ProximityHeatmap />
            </div>
          </div>
        );

      case 'dashboards':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom Dashboards</h2>
              <p className="text-gray-600">Create and manage custom visualizations and dashboards</p>
            </div>

            <div className="flex-1 overflow-auto">
              <DashboardBuilder />
            </div>
          </div>
        );

      case 'segments':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Device Segments</h2>
              <p className="text-gray-600">Analyze device cohorts by vendor, signal strength, activity, and more</p>
            </div>

            <div className="flex-1 overflow-auto">
              <DeviceSegments />
            </div>
          </div>
        );

      case 'timeseries':
        return (
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Time Series Explorer</h2>
              <p className="text-gray-600">Analyze temporal trends and patterns over time</p>
            </div>

            <div className="flex-1 overflow-auto">
              <TimeSeriesExplorer currentQuery={currentQuery} />
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500">Select a view from the sidebar</div>;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0'
        }`}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-6 h-6 text-primary-600" />
                  <h1 className="text-lg font-bold text-gray-900">Data Platform</h1>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-primary-50 rounded p-2">
                    <div className="text-primary-600 font-semibold">{stats.total_devices.toLocaleString()}</div>
                    <div className="text-gray-600">Devices</div>
                  </div>
                  <div className="bg-success-50 rounded p-2">
                    <div className="text-success-600 font-semibold">{stats.active_devices.toLocaleString()}</div>
                    <div className="text-gray-600">Active</div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg mb-1 text-left transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${isActive ? 'text-primary-900' : 'text-gray-900'}`}>
                        {item.label}
                      </div>
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <a
                href="/app"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                <Radio className="w-4 h-4" />
                Main Dashboard
              </a>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-700 mr-4"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1">
            {stats && (
              <div className="text-sm text-gray-600">
                {stats.total_devices.toLocaleString()} total devices · {stats.active_devices.toLocaleString()} active · {stats.total_aps.toLocaleString()} access points
              </div>
            )}
            {viewResults['saved-queries'] && (
              <div className="text-xs text-gray-500 mt-1">
                Last saved query: {viewResults['saved-queries'].name}{' '}
                ({viewResults['saved-queries'].stats?.total?.toLocaleString() || 0} results)
              </div>
            )}
          </div>

          <button
            onClick={fetchStats}
            className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Refresh
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DataPlatform;
