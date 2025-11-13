import { useState, useEffect } from 'react';
import { BookmarkIcon, Play, Trash2, Star, Clock, TrendingUp, Download } from 'lucide-react';
import { format } from 'date-fns';
import { apiService } from '../services/api';

export default function SavedQueries({ onResultsChange }) {
  const [savedQueries, setSavedQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [runningQuery, setRunningQuery] = useState(false);
  const [queryError, setQueryError] = useState(null);

  const timeRangeMap = {
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '6h': 360,
    '24h': 1440,
    '7d': 10080,
    '30d': 43200,
    'all': undefined,
  };

  const getFilterType = (filter) => filter.type || (typeof filter.value === 'number' ? 'number' : 'text');

  const normalizeBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (value === undefined || value === null) return false;
    return String(value).toLowerCase() === 'true';
  };

  const normalizeNumber = (value) => {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const normalizeString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value);
  };

  const evaluateFilter = (item, filter) => {
    const value = item[filter.field];
    const filterType = getFilterType(filter);
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        if (filterType === 'boolean') {
          return normalizeBoolean(value) === normalizeBoolean(filterValue);
        }
        if (filterType === 'number') {
          return normalizeNumber(value) === Number(filterValue);
        }
        return normalizeString(value).toLowerCase() === normalizeString(filterValue).toLowerCase();
      case 'contains':
        return normalizeString(value).toLowerCase().includes(normalizeString(filterValue).toLowerCase());
      case 'starts_with':
        return normalizeString(value).toLowerCase().startsWith(normalizeString(filterValue).toLowerCase());
      case 'ends_with':
        return normalizeString(value).toLowerCase().endsWith(normalizeString(filterValue).toLowerCase());
      case 'greater_than':
        return normalizeNumber(value) > Number(filterValue);
      case 'less_than':
        return normalizeNumber(value) < Number(filterValue);
      default:
        return true;
    }
  };

  const applyFilters = (items, filters = []) => {
    if (!filters || filters.length === 0) {
      return items;
    }
    return items.filter(item => filters.every(filter => evaluateFilter(item, filter)));
  };

  const calculateAvgRSSI = (values) => {
    if (!values || values.length === 0) return 'N/A';
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return `${avg.toFixed(1)} dBm`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return 'N/A';
    }
    try {
      return format(new Date(timestamp), 'MMM d, HH:mm:ss');
    } catch {
      return String(timestamp);
    }
  };

  const fetchDatasetForQuery = async (query, targetType) => {
    const minutes = query.timeRange ? timeRangeMap[query.timeRange] : 60;
    const limit = query.limit || 100;

    if (targetType === 'aps') {
      return apiService.getAccessPoints(limit);
    }

    return minutes
      ? apiService.getActiveDevices(minutes)
      : apiService.getDevices(limit);
  };

  const exportResults = () => {
    if (!queryResults?.rows) return;
    const blob = new Blob([JSON.stringify(queryResults.rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${queryResults.name.toLowerCase().replace(/\s+/g, '-')}-results.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Pre-built queries that are always available
  const prebuiltQueries = [
    // PREMIUM: Building Management Queries
    {
      id: 'real-time-occupancy',
      name: 'Real-Time Occupancy',
      description: 'Active devices in last 5 minutes for live occupancy counting',
      icon: Star,
      iconColor: 'text-success-600',
      query: {
        filters: [],
        timeRange: '5m',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 500
      },
      category: 'building',
      premium: true
    },
    {
      id: 'peak-hours',
      name: 'Peak Hour Detection',
      description: 'Identify busiest hours for HVAC/lighting optimization',
      icon: TrendingUp,
      iconColor: 'text-warning-600',
      query: {
        filters: [],
        timeRange: '24h',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 1000
      },
      category: 'building',
      premium: true
    },
    {
      id: 'zone-occupancy',
      name: 'Zone Occupancy Analysis',
      description: 'Device distribution by signal strength for space utilization',
      icon: Star,
      iconColor: 'text-primary-600',
      query: {
        filters: [
          { field: 'connected', operator: 'equals', value: 'true', type: 'boolean' }
        ],
        timeRange: '15m',
        sortBy: 'rssi',
        sortOrder: 'desc',
        limit: 200
      },
      category: 'building',
      premium: true
    },
    {
      id: 'dwell-time',
      name: 'Dwell Time Analysis',
      description: 'Long-stay devices for meeting room utilization',
      icon: Clock,
      iconColor: 'text-primary-600',
      query: {
        filters: [
          { field: 'packet_count', operator: 'greater_than', value: 500, type: 'number' }
        ],
        timeRange: '1h',
        sortBy: 'packet_count',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'building',
      premium: true
    },
    {
      id: 'energy-savings',
      name: 'Energy Savings Opportunities',
      description: 'Low occupancy periods for automated systems',
      icon: TrendingUp,
      iconColor: 'text-success-600',
      query: {
        filters: [],
        timeRange: '24h',
        sortBy: 'last_seen',
        sortOrder: 'asc',
        limit: 50
      },
      category: 'building',
      premium: true
    },
    {
      id: 'visitor-tracking',
      name: 'Visitor Pattern Tracking',
      description: 'New devices (first seen < 1 hour) for visitor analytics',
      icon: Star,
      iconColor: 'text-warning-600',
      query: {
        filters: [],
        timeRange: '1h',
        sortBy: 'first_seen',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'building',
      premium: true
    },
    {
      id: 'cleaning-schedule',
      name: 'Cleaning Schedule Optimizer',
      description: 'High-traffic areas based on device density',
      icon: TrendingUp,
      iconColor: 'text-primary-600',
      query: {
        filters: [
          { field: 'data_bytes', operator: 'greater_than', value: 100000, type: 'number' }
        ],
        timeRange: '24h',
        sortBy: 'data_bytes',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'building',
      premium: true
    },
    {
      id: 'meeting-room-usage',
      name: 'Meeting Room Utilization',
      description: 'Connected device clusters for room booking optimization',
      icon: Star,
      iconColor: 'text-success-600',
      query: {
        filters: [
          { field: 'connected', operator: 'equals', value: 'true', type: 'boolean' },
          { field: 'packet_count', operator: 'greater_than', value: 200, type: 'number' }
        ],
        timeRange: '1h',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 200
      },
      category: 'building',
      premium: true
    },
    {
      id: 'after-hours-occupancy',
      name: 'After-Hours Security',
      description: 'Devices active outside business hours for security monitoring',
      icon: Star,
      iconColor: 'text-error-600',
      query: {
        filters: [],
        timeRange: '24h',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'building',
      premium: true
    },
    {
      id: 'high-traffic-devices',
      name: 'High Traffic Devices',
      description: 'Devices with more than 1000 packets in the last hour',
      icon: TrendingUp,
      iconColor: 'text-primary-600',
      query: {
        filters: [
          { field: 'packet_count', operator: 'greater_than', value: 1000, type: 'number' }
        ],
        timeRange: '1h',
        sortBy: 'packet_count',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'traffic'
    },
    {
      id: 'connected-devices',
      name: 'Currently Connected Devices',
      description: 'All devices currently connected to access points',
      icon: Star,
      iconColor: 'text-success-600',
      query: {
        filters: [
          { field: 'connected', operator: 'equals', value: 'true', type: 'boolean' }
        ],
        timeRange: '5m',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'status'
    },
    {
      id: 'weak-signal',
      name: 'Weak Signal Devices',
      description: 'Devices with RSSI below -70 dBm',
      icon: TrendingUp,
      iconColor: 'text-warning-600',
      query: {
        filters: [
          { field: 'rssi', operator: 'less_than', value: -70, type: 'number' }
        ],
        timeRange: '15m',
        sortBy: 'rssi',
        sortOrder: 'asc',
        limit: 100
      },
      category: 'signal'
    },
    {
      id: 'apple-devices',
      name: 'Apple Devices',
      description: 'All devices from Apple vendor',
      icon: Star,
      iconColor: 'text-gray-600',
      query: {
        filters: [
          { field: 'vendor', operator: 'contains', value: 'Apple', type: 'text' }
        ],
        timeRange: '24h',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'vendor'
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Devices active in the last 5 minutes',
      icon: Clock,
      iconColor: 'text-primary-600',
      query: {
        filters: [],
        timeRange: '5m',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 50
      },
      category: 'time'
    },
    {
      id: 'high-data-volume',
      name: 'High Data Volume',
      description: 'Devices that transferred more than 10MB',
      icon: TrendingUp,
      iconColor: 'text-error-600',
      query: {
        filters: [
          { field: 'data_bytes', operator: 'greater_than', value: 10485760, type: 'number' }
        ],
        timeRange: '24h',
        sortBy: 'data_bytes',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'traffic'
    },
    {
      id: 'open-networks',
      name: 'Open WiFi Networks',
      description: 'Access points with no encryption',
      icon: Star,
      iconColor: 'text-error-600',
      query: {
        filters: [
          { field: 'encryption', operator: 'equals', value: 'Open', type: 'text' }
        ],
        timeRange: '24h',
        sortBy: 'last_seen',
        sortOrder: 'desc',
        limit: 100
      },
      category: 'security',
      targetType: 'aps'
    },
    {
      id: 'channel-11',
      name: 'Channel 11 Networks',
      description: 'Access points on WiFi channel 11',
      icon: TrendingUp,
      iconColor: 'text-primary-600',
      query: {
        filters: [
          { field: 'channel', operator: 'equals', value: 11, type: 'number' }
        ],
        timeRange: '1h',
        sortBy: 'beacon_count',
        sortOrder: 'desc',
        limit: 50
      },
      category: 'channel',
      targetType: 'aps'
    },
  ];

  // Load saved queries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('flux_saved_queries');
    if (stored) {
      setSavedQueries(JSON.parse(stored));
    }
  }, []);

  const runQuery = async (queryDefinition) => {
    setSelectedQuery(queryDefinition.id);
    setRunningQuery(true);
    setQueryError(null);

    try {
      const targetType = queryDefinition.targetType === 'aps' ? 'aps' : 'devices';
      const dataset = await fetchDatasetForQuery(queryDefinition.query, targetType);
      const filtered = applyFilters(dataset || [], queryDefinition.query.filters);
      const payload = {
        id: queryDefinition.id,
        name: queryDefinition.name,
        description: queryDefinition.description,
        targetType,
        rows: filtered,
        params: queryDefinition.query,
        stats: {
          total: filtered.length,
          limit: queryDefinition.query.limit || 100,
          timeRange: queryDefinition.query.timeRange || '1h',
          executedAt: new Date().toISOString(),
        },
      };

      setQueryResults(payload);
      if (onResultsChange) {
        onResultsChange(payload);
      }
    } catch (error) {
      console.error('Saved query execution failed:', error);
      setQueryError(error.message || 'Unable to run query');
    } finally {
      setRunningQuery(false);
    }
  };

  const deleteQuery = (queryId) => {
    const updated = savedQueries.filter(q => q.id !== queryId);
    setSavedQueries(updated);
    localStorage.setItem('flux_saved_queries', JSON.stringify(updated));
  };

  const categories = [
    { id: 'all', label: 'All Queries' },
    { id: 'building', label: 'Building Management' },
    { id: 'traffic', label: 'Traffic Analysis' },
    { id: 'status', label: 'Connection Status' },
    { id: 'signal', label: 'Signal Quality' },
    { id: 'vendor', label: 'Vendor Analysis' },
    { id: 'time', label: 'Time-based' },
    { id: 'security', label: 'Security' },
    { id: 'channel', label: 'Channel Analysis' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredQueries = selectedCategory === 'all'
    ? prebuiltQueries
    : prebuiltQueries.filter(q => q.category === selectedCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookmarkIcon className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Saved & Pre-built Queries</h3>
        </div>
        <span className="text-sm text-gray-500">
          {prebuiltQueries.length} pre-built queries available
        </span>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pre-built Queries */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Pre-built Queries</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQueries.map(query => {
            const Icon = query.icon;
            return (
              <div
                key={query.id}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedQuery === query.id
                    ? 'ring-2 ring-primary-500 shadow-lg'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${query.iconColor}`} />
                    <h5 className="font-semibold text-gray-900">{query.name}</h5>
                  </div>
                  <button
                    onClick={() => runQuery(query)}
                    className="p-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{query.description}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {query.query.timeRange}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {query.query.filters.length} filter{query.query.filters.length !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    Limit: {query.query.limit}
                  </span>
                  {query.targetType === 'aps' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-700">
                      Access Points
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Saved Queries */}
      {savedQueries.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Saved Queries</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedQueries.map(query => (
              <div key={query.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookmarkIcon className="w-5 h-5 text-primary-600" />
                    <h5 className="font-semibold text-gray-900">{query.name}</h5>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => runQuery(query)}
                      className="p-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteQuery(query.id)}
                      className="p-1.5 rounded-md bg-error-50 text-error-600 hover:bg-error-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{query.description || 'Custom query'}</p>
                <div className="flex flex-wrap gap-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {query.query.filters.length} filter{query.query.filters.length !== 1 ? 's' : ''}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {query.query.timeRange}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedCategory !== 'all' && filteredQueries.length === 0 && (
        <div className="empty-state">
          No queries found in this category
        </div>
      )}

      {/* Results Pane */}
      {(queryResults || runningQuery || queryError) && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Query Results</p>
              <h4 className="text-lg font-semibold text-gray-900">
                {queryResults ? queryResults.name : 'Pending query'}
              </h4>
              {queryResults && (
                <p className="text-sm text-gray-500">
                  Last run {formatTimestamp(queryResults.stats.executedAt)} ·{' '}
                  {queryResults.targetType === 'aps' ? 'Access Points' : 'Devices'}
                </p>
              )}
            </div>
            {queryResults?.rows?.length > 0 && (
              <button
                onClick={exportResults}
                className="btn btn-secondary btn-with-icon"
              >
                <Download className="icon-sm" />
                Export JSON
              </button>
            )}
          </div>

          {runningQuery && (
            <div className="loading-state">Running query...</div>
          )}

          {queryError && !runningQuery && (
            <div className="error-state">{queryError}</div>
          )}

          {queryResults && !runningQuery && !queryError && (
            <div className="card p-0 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-gray-100">
                <div className="p-4 border-r border-gray-100">
                  <p className="text-xs text-gray-500">Total Results</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {queryResults.stats.total.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 border-r border-gray-100">
                  <p className="text-xs text-gray-500">Time Range</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {queryResults.stats.timeRange.toUpperCase()}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500">Limit Applied</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {queryResults.stats.limit}
                  </p>
                </div>
              </div>

              <div className="overflow-auto">
                {queryResults.targetType === 'aps'
                  ? (
                    <table className="table">
                      <thead className="table-head">
                        <tr>
                          <th className="table-header-cell">BSSID</th>
                          <th className="table-header-cell">SSID</th>
                          <th className="table-header-cell">Channel</th>
                          <th className="table-header-cell">Encryption</th>
                          <th className="table-header-cell">Avg RSSI</th>
                          <th className="table-header-cell">Beacon Count</th>
                          <th className="table-header-cell">Last Seen</th>
                        </tr>
                      </thead>
                      <tbody className="table-body">
                        {queryResults.rows.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-8 text-gray-500">
                              No access points matched this query
                            </td>
                          </tr>
                        ) : (
                          queryResults.rows.map((ap) => (
                            <tr key={ap.bssid} className="table-row">
                              <td className="table-cell-mono">{ap.bssid}</td>
                              <td className="table-cell">{ap.ssid || 'Unknown'}</td>
                              <td className="table-cell">{ap.channel || 'N/A'}</td>
                              <td className="table-cell">{ap.encryption || 'Unknown'}</td>
                              <td className="table-cell">{calculateAvgRSSI(ap.rssi_values)}</td>
                              <td className="table-cell">{ap.beacon_count?.toLocaleString() || 0}</td>
                              <td className="table-cell">{formatTimestamp(ap.last_seen)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="table">
                      <thead className="table-head">
                        <tr>
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
                        {queryResults.rows.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-8 text-gray-500">
                              No devices matched this query
                            </td>
                          </tr>
                        ) : (
                          queryResults.rows.map((device) => (
                            <tr key={device.mac_address} className="table-row">
                              <td className="table-cell-mono">{device.mac_address}</td>
                              <td className="table-cell">{device.vendor || 'Unknown'}</td>
                              <td className="table-cell">
                                <span className={device.connected ? 'badge-connected' : 'badge-probe'}>
                                  {device.connected ? 'Connected' : 'Probing'}
                                </span>
                              </td>
                              <td className="table-cell">{calculateAvgRSSI(device.rssi_values)}</td>
                              <td className="table-cell">{device.packet_count?.toLocaleString() || 0}</td>
                              <td className="table-cell">{device.data_bytes?.toLocaleString() || 0}</td>
                              <td className="table-cell">{formatTimestamp(device.last_seen)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
