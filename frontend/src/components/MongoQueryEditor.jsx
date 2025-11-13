import { useState, useRef } from 'react';
import { Code, Play, BookOpen, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import QueryResults from './QueryResults';

export default function MongoQueryEditor({ onQueryExecute, onResultsChange }) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('device_events');
  const [limit, setLimit] = useState(100);
  const [skip, setSkip] = useState(0);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const collectionOptions = [
    { value: 'device_events', label: 'device_events (raw devices)' },
    { value: 'access_point_events', label: 'access_point_events (raw APs)' },
    { value: 'metrics_1m', label: 'metrics_1m (1-minute snapshots)' },
    { value: 'metrics_5m', label: 'metrics_5m (5-minute snapshots)' },
    { value: 'metrics_1h', label: 'metrics_1h (1-hour snapshots)' },
    { value: 'channel_config', label: 'channel_config' },
  ];

  // Sample queries for quick start
  const sampleQueries = {
    device_events: {
      'Connected devices (last 5m)': `{ "connected": true, "timestamp": { "$gte": new Date(Date.now() - 300000) } }`,
      'RSSI stronger than -50 dBm': `{ "rssi": { "$gt": -50 } }`,
      'Probe requests for "Guest"': `{ "event_type": "probe", "probe_ssid": { "$regex": "Guest", "$options": "i" } }`,
      'High traffic devices': `{ "data_byte_count": { "$gt": 1048576 } }`,
      'Specific MAC address': `{ "mac_address": "AA:BB:CC:DD:EE:FF" }`,
    },
    access_point_events: {
      'Open networks': `{ "encryption": "Open" }`,
      'Channel 11 APs': `{ "channel": 11 }`,
      'Strong AP beacons': `{ "rssi": { "$gt": -45 } }`,
      'Hidden SSIDs': `{ "ssid": { "$in": ["", null] } }`,
    },
    metrics_1m: {
      'Recent snapshots': `{ "timestamp": { "$gte": new Date(Date.now() - 3600000) } }`,
      'High active devices': `{ "devices.active": { "$gt": 50 } }`,
      'Low activity periods': `{ "devices.active": { "$lt": 5 } }`,
    },
  };

  // MongoDB operators reference
  const operators = [
    { op: '$eq', desc: 'Equals', example: '{ field: { $eq: value } }' },
    { op: '$ne', desc: 'Not equals', example: '{ field: { $ne: value } }' },
    { op: '$gt', desc: 'Greater than', example: '{ field: { $gt: value } }' },
    { op: '$gte', desc: 'Greater than or equal', example: '{ field: { $gte: value } }' },
    { op: '$lt', desc: 'Less than', example: '{ field: { $lt: value } }' },
    { op: '$lte', desc: 'Less than or equal', example: '{ field: { $lte: value } }' },
    { op: '$in', desc: 'In array', example: '{ field: { $in: [v1, v2] } }' },
    { op: '$nin', desc: 'Not in array', example: '{ field: { $nin: [v1, v2] } }' },
    { op: '$regex', desc: 'Pattern match', example: '{ field: { $regex: "pattern" } }' },
    { op: '$exists', desc: 'Field exists', example: '{ field: { $exists: true } }' },
    { op: '$elemMatch', desc: 'Array element match', example: '{ arr: { $elemMatch: { $gt: 10 } } }' },
    { op: '$and', desc: 'Logical AND', example: '{ $and: [{ f1: v1 }, { f2: v2 }] }' },
    { op: '$or', desc: 'Logical OR', example: '{ $or: [{ f1: v1 }, { f2: v2 }] }' },
  ];

  const validateQuery = (queryString) => {
    try {
      // Basic validation - check if it's valid JSON-like syntax
      const trimmed = queryString.trim();
      if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return { valid: false, error: 'Query must be a valid MongoDB filter object (start with { and end with })' };
      }

      // Try to parse as JSON (will fail for Date/ObjectId but that's ok)
      // We just want to catch basic syntax errors
      const jsonSafe = trimmed
        .replace(/new Date\([^)]*\)/g, '"DATE"')
        .replace(/ObjectId\([^)]*\)/g, '"OBJECTID"');

      JSON.parse(jsonSafe);

      // Check for dangerous operations
      const dangerous = ['$where', 'function', 'eval', 'Function', '$function'];
      for (const term of dangerous) {
        if (trimmed.includes(term)) {
          return { valid: false, error: `Dangerous operator "${term}" is not allowed for security reasons` };
        }
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, error: `Invalid JSON syntax: ${err.message}` };
    }
  };

  const executeQuery = async () => {
    setError(null);
    setResult(null);

    // Validate query
    const validation = validateQuery(query);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    try {
      setExecuting(true);

      // Call API to execute MongoDB query
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection,
          filter: query,
          limit,
          skip,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      if (onResultsChange) {
        onResultsChange(data);
      }

      // Also notify parent with structured query info (optional)
      if (onQueryExecute) {
        onQueryExecute({
          type: 'mongodb',
          collection,
          filter: query,
          resultCount: data.results?.length || 0
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const loadSampleQuery = (sampleQuery) => {
    setQuery(sampleQuery);
    // Auto-focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Handle tab key for indentation
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = query.substring(0, start) + '  ' + query.substring(end);
      setQuery(newValue);

      // Set cursor position after the inserted spaces
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">MongoDB Query Editor</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>Read-only queries</span>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-warning-900 mb-1">Security Notice</h4>
            <p className="text-sm text-warning-700">
              Only read operations are allowed. Dangerous operators like $where, $function, and eval are blocked.
              All queries are validated before execution.
            </p>
          </div>
        </div>
      </div>

      {/* Collection Selector */}
      <div className="form-field">
        <label className="form-label">Collection</label>
        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          className="input"
        >
          {collectionOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Query Editor */}
      <div>
        <label className="form-label">MongoDB Filter Query</label>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Enter MongoDB filter query, e.g., { "vendor": "Apple" }'
          className="input font-mono text-sm w-full min-h-[200px] resize-y"
          spellCheck={false}
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter a valid MongoDB filter object. Use Tab for indentation.
        </p>
      </div>

      {/* Action & Pagination */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Limit</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={limit}
            onChange={(e) => setLimit(Math.min(1000, Math.max(1, Number(e.target.value))))}
            className="input"
          />
        </div>
        <div>
          <label className="form-label">Skip</label>
          <input
            type="number"
            min="0"
            value={skip}
            onChange={(e) => setSkip(Math.max(0, Number(e.target.value)))}
            className="input"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={executeQuery}
            disabled={executing || !query.trim()}
            className="btn btn-primary btn-icon flex-1"
          >
            <Play className="icon-sm" />
            {executing ? 'Executing...' : 'Execute Query'}
          </button>
          <button
            onClick={() => setQuery('')}
            className="btn btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sample Queries */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Sample Queries</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Object.entries(sampleQueries[collection] || {}).map(([name, sampleQuery]) => (
            <button
              key={name}
              onClick={() => loadSampleQuery(sampleQuery)}
              className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="text-xs text-gray-600 font-mono mt-1">{sampleQuery}</p>
            </button>
          ))}
          {(sampleQueries[collection] == null || Object.keys(sampleQueries[collection]).length === 0) && (
            <p className="text-xs text-gray-500">No sample queries available for this collection.</p>
          )}
        </div>
      </div>

      {/* MongoDB Operators Reference */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">MongoDB Operators Reference</h4>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[300px] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3">
            {operators.map((op) => (
              <div key={op.op} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <code className="text-sm font-semibold text-primary-600">{op.op}</code>
                    <span className="text-sm text-gray-600 ml-2">- {op.desc}</span>
                  </div>
                </div>
                <code className="text-xs text-gray-500 block mt-1">{op.example}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex gap-3">
            <XCircle className="w-5 h-5 text-error-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-error-900">Query Error</h4>
              <p className="text-sm text-error-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Result Summary */}
      {result && !error && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-success-900">Query Executed Successfully</h4>
              <p className="text-sm text-success-700 mt-1">
                Found {result.results?.length || 0} result(s) in {result.executionTime || 0}ms
              </p>
              {result.warning && (
                <p className="text-sm text-warning-700 mt-2">⚠️ {result.warning}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Fields Reference */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Available Fields</h4>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          {collection === 'device_events' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {['timestamp', 'mac_address', 'event_type', 'rssi', 'probe_ssid', 'vendor', 'connected', 'bssid', 'data_frame_count', 'data_byte_count'].map(field => (
                <code key={field} className="text-gray-700">{field}</code>
              ))}
            </div>
          )}
          {collection === 'access_point_events' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {['timestamp', 'bssid', 'ssid', 'channel', 'rssi', 'encryption', 'event_type'].map(field => (
                <code key={field} className="text-gray-700">{field}</code>
              ))}
            </div>
          )}
          {collection?.startsWith('metrics_') && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {['timestamp', 'devices.total', 'devices.active', 'devices.connected', 'access_points.total', 'access_points.active', 'device_metrics', 'ap_metrics'].map(field => (
                <code key={field} className="text-gray-700">{field}</code>
              ))}
            </div>
          )}
          {collection === 'channel_config' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {['enabled', 'timeout_ms', 'channels', 'last_updated'].map(field => (
                <code key={field} className="text-gray-700">{field}</code>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Query Results Display */}
      {result && result.results && (
        <QueryResults results={result} />
      )}
    </div>
  );
}
