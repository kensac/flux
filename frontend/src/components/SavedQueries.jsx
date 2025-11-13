import { useState, useEffect } from 'react';
import { BookmarkIcon, Play, Trash2, Star, Clock, TrendingUp } from 'lucide-react';

export default function SavedQueries({ onQuerySelect, onResultsChange }) {
  const [savedQueries, setSavedQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);

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

  const runQuery = (query) => {
    setSelectedQuery(query.id);
    // Actually execute the query by passing it to the parent
    onQuerySelect(query.query);
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
    </div>
  );
}
