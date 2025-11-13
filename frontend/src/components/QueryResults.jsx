import { useState } from 'react';
import { Table, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function QueryResults({ results }) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'json'

  if (!results || !results.results || results.results.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          No results to display. Execute a query to see results here.
        </div>
      </div>
    );
  }

  const data = results.results;

  const toggleRowExpansion = (index) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Get all unique keys from all results
  const allKeys = Array.from(
    new Set(data.flatMap(item => Object.keys(item)))
  ).filter(key => key !== '_id'); // Exclude MongoDB _id

  // Format value for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length <= 3) return JSON.stringify(value);
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      if (value instanceof Date || typeof value === 'string' && !isNaN(Date.parse(value))) {
        try {
          return format(new Date(value), 'PPp');
        } catch {
          return String(value);
        }
      }
      return JSON.stringify(value);
    }
    return String(value);
  };

  const exportResults = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query-results-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Query Results</h3>
          <span className="text-sm text-gray-500">
            ({data.length} result{data.length !== 1 ? 's' : ''})
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'json'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              JSON
            </button>
          </div>
          <button
            onClick={exportResults}
            className="btn btn-secondary btn-icon"
          >
            <Download className="icon-sm" />
            Export
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header-cell w-10">Expand</th>
                {allKeys.slice(0, 6).map(key => (
                  <th key={key} className="table-header-cell">{key}</th>
                ))}
                {allKeys.length > 6 && (
                  <th className="table-header-cell">More...</th>
                )}
              </tr>
            </thead>
            <tbody className="table-body">
              {data.map((row, index) => (
                <>
                  <tr key={index} className="table-row">
                    <td className="table-cell">
                      <button
                        onClick={() => toggleRowExpansion(index)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(index) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    {allKeys.slice(0, 6).map(key => (
                      <td key={key} className="table-cell">
                        {formatValue(row[key])}
                      </td>
                    ))}
                    {allKeys.length > 6 && (
                      <td className="table-cell text-gray-500">
                        {allKeys.length - 6} more field{allKeys.length - 6 !== 1 ? 's' : ''}
                      </td>
                    )}
                  </tr>
                  {expandedRows.has(index) && (
                    <tr>
                      <td colSpan={Math.min(allKeys.length + 1, 8)} className="bg-gray-50 p-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm mb-2">Full Record</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {Object.entries(row)
                              .filter(([key]) => key !== '_id')
                              .map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-semibold text-gray-700 min-w-[140px]">
                                    {key}:
                                  </span>
                                  <span className="text-gray-900 break-all">
                                    {Array.isArray(value) ? (
                                      <span className="font-mono text-xs">
                                        {JSON.stringify(value, null, 2)}
                                      </span>
                                    ) : (
                                      formatValue(value)
                                    )}
                                  </span>
                                </div>
                              ))}
                          </div>
                          {row._id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <span className="text-xs text-gray-500">
                                MongoDB ID: <code className="font-mono">{String(row._id)}</code>
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Results:</span>
            <span className="ml-2 font-semibold">{data.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Fields:</span>
            <span className="ml-2 font-semibold">{allKeys.length}</span>
          </div>
          {results.executionTime && (
            <div>
              <span className="text-gray-600">Execution Time:</span>
              <span className="ml-2 font-semibold">{results.executionTime}ms</span>
            </div>
          )}
          {results.collection && (
            <div>
              <span className="text-gray-600">Collection:</span>
              <span className="ml-2 font-semibold">{results.collection}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
