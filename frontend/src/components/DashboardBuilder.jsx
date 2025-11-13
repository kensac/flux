import { useState, useEffect } from 'react';
import { Layout, Save, Upload, Download, Plus, X, Grid3x3 } from 'lucide-react';
import ChartBuilder from './ChartBuilder';

export default function DashboardBuilder() {
  const [dashboards, setDashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [showNewDashboard, setShowNewDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');

  // Load dashboards from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flux_dashboards');
    if (saved) {
      const parsed = JSON.parse(saved);
      setDashboards(parsed);
      if (parsed.length > 0 && !activeDashboard) {
        setActiveDashboard(parsed[0].id);
      }
    }
  }, []);

  // Save dashboards to localStorage
  const saveDashboards = (newDashboards) => {
    setDashboards(newDashboards);
    localStorage.setItem('flux_dashboards', JSON.stringify(newDashboards));
  };

  const createDashboard = () => {
    if (!newDashboardName.trim()) return;

    const newDashboard = {
      id: Date.now(),
      name: newDashboardName,
      layout: 'grid', // 'grid' or 'freeform'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [...dashboards, newDashboard];
    saveDashboards(updated);
    setActiveDashboard(newDashboard.id);
    setShowNewDashboard(false);
    setNewDashboardName('');
  };

  const deleteDashboard = (dashboardId) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    const updated = dashboards.filter(d => d.id !== dashboardId);
    saveDashboards(updated);

    if (activeDashboard === dashboardId) {
      setActiveDashboard(updated.length > 0 ? updated[0].id : null);
    }
  };

  const renameDashboard = (dashboardId, newName) => {
    const updated = dashboards.map(d =>
      d.id === dashboardId
        ? { ...d, name: newName, updatedAt: new Date().toISOString() }
        : d
    );
    saveDashboards(updated);
  };

  const exportDashboard = (dashboardId) => {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return;

    // Get charts for this dashboard
    const charts = JSON.parse(localStorage.getItem('flux_custom_charts') || '[]');

    const exportData = {
      version: '1.0',
      dashboard,
      charts,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${dashboard.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importDashboard = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.dashboard && data.charts) {
          // Import dashboard
          const newDashboard = {
            ...data.dashboard,
            id: Date.now(), // New ID to avoid conflicts
            importedAt: new Date().toISOString(),
          };

          saveDashboards([...dashboards, newDashboard]);
          setActiveDashboard(newDashboard.id);

          // Import charts
          const existingCharts = JSON.parse(localStorage.getItem('flux_custom_charts') || '[]');
          const newCharts = data.charts.map(chart => ({
            ...chart,
            id: Date.now() + Math.random(), // New IDs
          }));
          localStorage.setItem('flux_custom_charts', JSON.stringify([...existingCharts, ...newCharts]));

          alert('Dashboard imported successfully!');
        }
      } catch (error) {
        alert('Invalid dashboard file');
      }
    };
    reader.readAsText(file);
  };

  const currentDashboard = dashboards.find(d => d.id === activeDashboard);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Dashboard Builder</h3>
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
          {currentDashboard && (
            <button
              onClick={() => exportDashboard(currentDashboard.id)}
              className="btn btn-secondary btn-icon"
            >
              <Download className="icon-sm" />
              Export
            </button>
          )}
          <button
            onClick={() => setShowNewDashboard(true)}
            className="btn btn-primary btn-icon"
          >
            <Plus className="icon-sm" />
            New Dashboard
          </button>
        </div>
      </div>

      {/* Dashboard Tabs */}
      {dashboards.length > 0 && (
        <div className="border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {dashboards.map(dashboard => (
              <div
                key={dashboard.id}
                className={`group flex items-center gap-2 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeDashboard === dashboard.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveDashboard(dashboard.id)}
              >
                <Grid3x3 className="w-4 h-4" />
                <span className="font-medium whitespace-nowrap">{dashboard.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDashboard(dashboard.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error-50 rounded"
                >
                  <X className="w-3 h-3 text-error-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Dashboard Modal */}
      {showNewDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Dashboard</h3>
            <div className="form-field mb-6">
              <label className="form-label">Dashboard Name</label>
              <input
                type="text"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="My Custom Dashboard"
                className="input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createDashboard();
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewDashboard(false);
                  setNewDashboardName('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={createDashboard}
                className="btn btn-primary"
                disabled={!newDashboardName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      {currentDashboard ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <input
                type="text"
                value={currentDashboard.name}
                onChange={(e) => renameDashboard(currentDashboard.id, e.target.value)}
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(currentDashboard.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Chart Builder for this dashboard */}
          <ChartBuilder />
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Layout className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="mb-4">No dashboards yet</p>
            <button
              onClick={() => setShowNewDashboard(true)}
              className="btn btn-primary btn-icon"
            >
              <Plus className="icon-sm" />
              Create Your First Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card bg-primary-50 border-primary-200">
        <h4 className="font-semibold text-primary-900 mb-2">Pro Tips</h4>
        <ul className="text-sm text-primary-700 space-y-1 list-disc list-inside">
          <li>Create multiple dashboards for different use cases (operations, security, analytics)</li>
          <li>Use groupBy with aggregate functions to create summary charts</li>
          <li>Pie charts work best with groupBy enabled to show distribution</li>
          <li>Export dashboards to share with your team or backup your configurations</li>
          <li>Charts auto-refresh when you switch between dashboards</li>
        </ul>
      </div>
    </div>
  );
}
