import { useState, useEffect, useMemo } from 'react';
import { BarChart3, Plus, Trash2, Settings, Eye, Save, Upload } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { apiService } from '../services/api';

export default function ChartBuilder({ onSave }) {
  const [charts, setCharts] = useState([]);
  const [editingChart, setEditingChart] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [dataSource, setDataSource] = useState('devices');
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load saved charts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flux_custom_charts');
    if (saved) {
      setCharts(JSON.parse(saved));
    }
  }, []);

  // Save charts to localStorage
  const saveCharts = (newCharts) => {
    setCharts(newCharts);
    localStorage.setItem('flux_custom_charts', JSON.stringify(newCharts));
    if (onSave) onSave(newCharts);
  };

  const addNewChart = () => {
    const newChart = {
      id: Date.now(),
      name: 'New Chart',
      type: 'line',
      dataSource: 'devices',
      xAxis: 'last_seen',
      yAxis: 'packet_count',
      groupBy: null,
      aggregate: 'sum',
      filters: [],
      colors: ['#0284c7', '#16a34a', '#f59e0b', '#ef4444'],
      showLegend: true,
      showGrid: true,
      width: 6, // Grid width (1-12)
    };
    setEditingChart(newChart);
    setShowBuilder(true);
  };

  const editChart = (chart) => {
    setEditingChart({ ...chart });
    setDataSource(chart.dataSource);
    setShowBuilder(true);
  };

  const deleteChart = (chartId) => {
    saveCharts(charts.filter(c => c.id !== chartId));
  };

  const saveChart = () => {
    if (!editingChart) return;

    const existingIndex = charts.findIndex(c => c.id === editingChart.id);
    if (existingIndex >= 0) {
      const updated = [...charts];
      updated[existingIndex] = editingChart;
      saveCharts(updated);
    } else {
      saveCharts([...charts, editingChart]);
    }

    setShowBuilder(false);
    setEditingChart(null);
  };

  // Fetch data based on data source
  const fetchData = async () => {
    setLoading(true);
    try {
      let data;
      switch (dataSource) {
        case 'devices':
          data = await apiService.getDevices(500);
          break;
        case 'access_points':
          data = await apiService.getAccessPoints(200);
          break;
        case 'metrics':
          const metrics = await apiService.getMetricsHistory({ tier: '1h', limit: 168 });
          data = metrics.snapshots || [];
          break;
        default:
          data = [];
      }
      setRawData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showBuilder) {
      fetchData();
    }
  }, [dataSource, showBuilder]);

  // Get available fields for the selected data source
  const availableFields = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    const firstItem = rawData[0];
    const fields = Object.keys(firstItem).filter(key => {
      const value = firstItem[key];
      return typeof value === 'number' || typeof value === 'string' || value instanceof Date;
    });

    return fields;
  }, [rawData]);

  // Export dashboard configuration
  const exportDashboard = () => {
    const config = {
      version: '1.0',
      charts,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import dashboard configuration
  const importDashboard = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (config.charts) {
          saveCharts(config.charts);
        }
      } catch (error) {
        alert('Invalid dashboard file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Custom Chart Builder</h3>
        </div>
        <div className="flex gap-2">
          <label className="btn btn-secondary btn-icon cursor-pointer">
            <Upload className="icon-sm" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={importDashboard}
              className="hidden"
            />
          </label>
          <button
            onClick={exportDashboard}
            className="btn btn-secondary btn-icon"
            disabled={charts.length === 0}
          >
            <Save className="icon-sm" />
            Export
          </button>
          <button
            onClick={addNewChart}
            className="btn btn-primary btn-icon"
          >
            <Plus className="icon-sm" />
            Add Chart
          </button>
        </div>
      </div>

      {/* Chart Grid */}
      {charts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {charts.map(chart => (
            <ChartRenderer
              key={chart.id}
              chart={chart}
              onEdit={() => editChart(chart)}
              onDelete={() => deleteChart(chart.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="mb-4">No custom charts yet</p>
            <button onClick={addNewChart} className="btn btn-primary btn-icon">
              <Plus className="icon-sm" />
              Create Your First Chart
            </button>
          </div>
        </div>
      )}

      {/* Chart Builder Modal */}
      {showBuilder && editingChart && (
        <ChartBuilderModal
          chart={editingChart}
          onChange={setEditingChart}
          onSave={saveChart}
          onCancel={() => {
            setShowBuilder(false);
            setEditingChart(null);
          }}
          dataSource={dataSource}
          setDataSource={setDataSource}
          availableFields={availableFields}
          rawData={rawData}
          loading={loading}
          onRefreshData={fetchData}
        />
      )}
    </div>
  );
}

// Chart Renderer Component
function ChartRenderer({ chart, onEdit, onDelete }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAndProcessData();
  }, [chart]);

  const fetchAndProcessData = async () => {
    setLoading(true);
    try {
      let rawData;
      switch (chart.dataSource) {
        case 'devices':
          rawData = await apiService.getDevices(500);
          break;
        case 'access_points':
          rawData = await apiService.getAccessPoints(200);
          break;
        case 'metrics':
          const metrics = await apiService.getMetricsHistory({ tier: '1h', limit: 168 });
          rawData = metrics.snapshots || [];
          break;
        default:
          rawData = [];
      }

      // Process data based on chart configuration
      const processed = processChartData(rawData, chart);
      setData(processed);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (rawData, config) => {
    if (!rawData || rawData.length === 0) return [];

    // For pie charts and grouped data
    if (config.groupBy) {
      const grouped = rawData.reduce((acc, item) => {
        const key = item[config.groupBy] || 'Unknown';
        if (!acc[key]) {
          acc[key] = { name: key, value: 0, count: 0 };
        }

        const value = Number(item[config.yAxis]) || 0;
        switch (config.aggregate) {
          case 'sum':
            acc[key].value += value;
            break;
          case 'avg':
            acc[key].value += value;
            acc[key].count++;
            break;
          case 'count':
            acc[key].value++;
            break;
          case 'max':
            acc[key].value = Math.max(acc[key].value, value);
            break;
          case 'min':
            acc[key].value = acc[key].value === 0 ? value : Math.min(acc[key].value, value);
            break;
        }
        return acc;
      }, {});

      const result = Object.values(grouped).map(item => {
        if (config.aggregate === 'avg' && item.count > 0) {
          item.value = item.value / item.count;
        }
        return item;
      });

      return result.sort((a, b) => b.value - a.value).slice(0, 20);
    }

    // For time-series and scatter charts
    return rawData.slice(0, 200).map(item => ({
      x: item[config.xAxis],
      y: Number(item[config.yAxis]) || 0,
      name: item[config.xAxis],
    }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-state">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">{chart.name}</h4>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-error-100 text-error-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          {chart.type === 'line' && (
            <LineChart data={data}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
              <XAxis dataKey="name" stroke="#737373" style={{ fontSize: '12px' }} />
              <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip />
              {chart.showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="y"
                stroke={chart.colors[0]}
                strokeWidth={2}
                name={chart.yAxis}
              />
            </LineChart>
          )}
          {chart.type === 'bar' && (
            <BarChart data={data}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
              <XAxis dataKey="name" stroke="#737373" style={{ fontSize: '12px' }} />
              <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip />
              {chart.showLegend && <Legend />}
              <Bar dataKey="value" fill={chart.colors[0]} name={chart.yAxis} />
            </BarChart>
          )}
          {chart.type === 'area' && (
            <AreaChart data={data}>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
              <XAxis dataKey="name" stroke="#737373" style={{ fontSize: '12px' }} />
              <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip />
              {chart.showLegend && <Legend />}
              <Area
                type="monotone"
                dataKey="y"
                stroke={chart.colors[0]}
                fill={chart.colors[0]}
                fillOpacity={0.6}
                name={chart.yAxis}
              />
            </AreaChart>
          )}
          {chart.type === 'pie' && (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chart.colors[index % chart.colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
          {chart.type === 'scatter' && (
            <ScatterChart>
              {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
              <XAxis dataKey="x" stroke="#737373" style={{ fontSize: '12px' }} />
              <YAxis dataKey="y" stroke="#737373" style={{ fontSize: '12px' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              {chart.showLegend && <Legend />}
              <Scatter name={chart.name} data={data} fill={chart.colors[0]} />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      ) : (
        <div className="empty-state">No data available</div>
      )}
    </div>
  );
}

// Chart Builder Modal Component
function ChartBuilderModal({
  chart,
  onChange,
  onSave,
  onCancel,
  dataSource,
  setDataSource,
  availableFields,
  rawData,
  loading,
  onRefreshData
}) {
  const updateChart = (field, value) => {
    onChange({ ...chart, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Configure Chart</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label">Chart Name</label>
              <input
                type="text"
                value={chart.name}
                onChange={(e) => updateChart('name', e.target.value)}
                className="input"
                placeholder="My Chart"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Chart Type</label>
              <select
                value={chart.type}
                onChange={(e) => updateChart('type', e.target.value)}
                className="input"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="scatter">Scatter Plot</option>
              </select>
            </div>
          </div>

          {/* Data Source */}
          <div className="form-field">
            <label className="form-label">Data Source</label>
            <select
              value={dataSource}
              onChange={(e) => {
                setDataSource(e.target.value);
                updateChart('dataSource', e.target.value);
              }}
              className="input"
            >
              <option value="devices">Devices</option>
              <option value="access_points">Access Points</option>
              <option value="metrics">Metrics (Time Series)</option>
            </select>
          </div>

          {/* Axis Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label">X-Axis / Label Field</label>
              <select
                value={chart.xAxis}
                onChange={(e) => updateChart('xAxis', e.target.value)}
                className="input"
                disabled={loading}
              >
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Y-Axis / Value Field</label>
              <select
                value={chart.yAxis}
                onChange={(e) => updateChart('yAxis', e.target.value)}
                className="input"
                disabled={loading}
              >
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grouping & Aggregation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-field">
              <label className="form-label">Group By (Optional)</label>
              <select
                value={chart.groupBy || ''}
                onChange={(e) => updateChart('groupBy', e.target.value || null)}
                className="input"
              >
                <option value="">None</option>
                {availableFields.map(field => (
                  <option key={field} value={field}>{field}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">Aggregate Function</label>
              <select
                value={chart.aggregate}
                onChange={(e) => updateChart('aggregate', e.target.value)}
                className="input"
                disabled={!chart.groupBy}
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="count">Count</option>
                <option value="max">Maximum</option>
                <option value="min">Minimum</option>
              </select>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Display Options</h4>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chart.showLegend}
                  onChange={(e) => updateChart('showLegend', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Legend</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={chart.showGrid}
                  onChange={(e) => updateChart('showGrid', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Show Grid</span>
              </label>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Preview</h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading data...</div>
              ) : rawData && rawData.length > 0 ? (
                <div className="text-sm text-gray-600">
                  Data source ready: {rawData.length} records
                  <button onClick={onRefreshData} className="ml-4 text-primary-600 hover:text-primary-700">
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onSave} className="btn btn-primary">
            Save Chart
          </button>
        </div>
      </div>
    </div>
  );
}
