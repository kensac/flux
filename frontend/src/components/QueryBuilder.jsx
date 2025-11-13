import { useState, useEffect } from 'react';
import { Filter, Play, X, Plus } from 'lucide-react';

export default function QueryBuilder({ onQueryExecute, externalQuery }) {
  const [filters, setFilters] = useState([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [limit, setLimit] = useState(100);
  const [sortBy, setSortBy] = useState('last_seen');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load external query if provided
  useEffect(() => {
    if (externalQuery) {
      setFilters(externalQuery.filters || []);
      setTimeRange(externalQuery.timeRange || '1h');
      setLimit(externalQuery.limit || 100);
      setSortBy(externalQuery.sortBy || 'last_seen');
      setSortOrder(externalQuery.sortOrder || 'desc');
    }
  }, [externalQuery]);

  const filterFields = [
    { value: 'vendor', label: 'Device Vendor', type: 'text' },
    { value: 'connected', label: 'Connection Status', type: 'boolean' },
    { value: 'rssi', label: 'Signal Strength (RSSI)', type: 'number' },
    { value: 'channel', label: 'WiFi Channel', type: 'number' },
    { value: 'encryption', label: 'Encryption Type', type: 'text' },
    { value: 'ssid', label: 'SSID', type: 'text' },
    { value: 'packet_count', label: 'Packet Count', type: 'number' },
    { value: 'data_bytes', label: 'Data Bytes', type: 'number' },
  ];

  const operators = {
    text: [
      { value: 'equals', label: 'Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'starts_with', label: 'Starts with' },
      { value: 'ends_with', label: 'Ends with' },
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'greater_than', label: 'Greater than' },
      { value: 'less_than', label: 'Less than' },
      { value: 'between', label: 'Between' },
    ],
    boolean: [
      { value: 'equals', label: 'Is' },
    ],
  };

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Date.now(),
        field: 'vendor',
        operator: 'contains',
        value: '',
        type: 'text'
      }
    ]);
  };

  const removeFilter = (id) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id, key, value) => {
    setFilters(filters.map(f => {
      if (f.id === id) {
        const updates = { [key]: value };

        // If field changed, update type and reset operator
        if (key === 'field') {
          const field = filterFields.find(ff => ff.value === value);
          updates.type = field.type;
          updates.operator = operators[field.type][0].value;
          updates.value = '';
        }

        return { ...f, ...updates };
      }
      return f;
    }));
  };

  const executeQuery = () => {
    const query = {
      filters,
      timeRange,
      limit,
      sortBy,
      sortOrder,
      timestamp: new Date().toISOString()
    };

    onQueryExecute(query);
  };

  const clearAll = () => {
    setFilters([]);
    setTimeRange('1h');
    setLimit(100);
    setSortBy('last_seen');
    setSortOrder('desc');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="card-header">
          <Filter className="card-header-icon" />
          Query Builder
        </h2>
        <div className="flex gap-2">
          <button
            onClick={clearAll}
            className="btn btn-secondary btn-icon"
            disabled={filters.length === 0}
          >
            <X className="icon-sm" />
            Clear All
          </button>
          <button
            onClick={executeQuery}
            className="btn btn-primary btn-icon"
          >
            <Play className="icon-sm" />
            Run Query
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>

          {filters.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm mb-3">No filters applied</p>
              <button
                onClick={addFilter}
                className="btn btn-secondary btn-icon"
              >
                <Plus className="icon-sm" />
                Add Filter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={filter.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 w-8">
                    {index === 0 ? 'WHERE' : 'AND'}
                  </span>

                  {/* Field */}
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                    className="input flex-1 min-w-[150px]"
                  >
                    {filterFields.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                    className="input flex-1 min-w-[120px]"
                  >
                    {operators[filter.type].map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {/* Value */}
                  {filter.type === 'boolean' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      className="input flex-1 min-w-[100px]"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type={filter.type === 'number' ? 'number' : 'text'}
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      placeholder="Value..."
                      className="input flex-1 min-w-[150px]"
                    />
                  )}

                  {/* Remove */}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-2 text-error-600 hover:bg-error-50 rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={addFilter}
                className="btn btn-secondary btn-icon w-full"
              >
                <Plus className="icon-sm" />
                Add Filter
              </button>
            </div>
          )}
        </div>

        {/* Query Options */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div className="form-field">
            <label className="form-label">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="input"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input"
            >
              <option value="last_seen">Last Seen</option>
              <option value="first_seen">First Seen</option>
              <option value="packet_count">Packet Count</option>
              <option value="data_bytes">Data Volume</option>
              <option value="rssi">Signal Strength</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Sort Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Result Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="input"
            >
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
              <option value={250}>250 results</option>
              <option value={500}>500 results</option>
              <option value={1000}>1000 results</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
