import { useState, useEffect } from 'react';
import { Lightbulb, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function LightingManagement({ stats, config, historicalData, onConfigUpdate }) {
  const [localConfig, setLocalConfig] = useState({
    minOccupancy: 5,
    fullCostPerHour: 8,
    dimmedCostPerHour: 2
  });
  const [formConfig, setFormConfig] = useState({ ...localConfig });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setFormConfig(config);
    }
  }, [config]);

  const baselineDevices = 15;
  const detectedDevices = stats?.devices?.active || 0;
  const estimatedPeople = Math.max(0, detectedDevices - baselineDevices);
  
  // Determine lighting mode
  let lightingMode = 'Full Lighting';
  let currentCostRate = localConfig.fullCostPerHour;
  
  if (estimatedPeople >= localConfig.minOccupancy) {
    lightingMode = 'Full Lighting';
    currentCostRate = localConfig.fullCostPerHour;
  } else if (estimatedPeople > 0) {
    lightingMode = 'Dimmed (30%)';
    currentCostRate = localConfig.dimmedCostPerHour;
  } else {
    lightingMode = 'Emergency Only';
    currentCostRate = localConfig.dimmedCostPerHour * 0.5;
  }

  // Calculate costs - matches operations.html exactly
  const hoursPerDay = 24;
  const standardDaily = localConfig.fullCostPerHour * hoursPerDay;
  const optimizedDaily = localConfig.fullCostPerHour * 10 + localConfig.dimmedCostPerHour * 14; // 10 hours full, 14 dimmed

  const daySavings = standardDaily - optimizedDaily;
  const monthSavings = daySavings * 30;
  const yearSavings = daySavings * 365;

  const handleUpdate = async () => {
    setSaving(true);
    try {
      setLocalConfig(formConfig);
      await apiService.updateOperationsConfig({ lighting: formConfig });
      if (onConfigUpdate) onConfigUpdate();
      // Success - config saved to localStorage
    } catch (error) {
      console.error('Error saving lighting config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Lightbulb className="card-header-icon" />
        Lighting Management
      </h2>

      {/* Configuration */}
      <div className="section-spacing">
        <h3 className="subsection-title">Configuration</h3>
        <div className="config-form-grid-3">
          <div className="form-field">
            <label className="form-label">Min Occupancy for Full Lighting</label>
            <input
              type="number"
              className="input"
              value={formConfig.minOccupancy}
              onChange={(e) => setFormConfig({...formConfig, minOccupancy: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Lighting Cost (Full) $/hr</label>
            <input
              type="number"
              className="input"
              value={formConfig.fullCostPerHour}
              onChange={(e) => setFormConfig({...formConfig, fullCostPerHour: parseFloat(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Lighting Cost (Dimmed) $/hr</label>
            <input
              type="number"
              className="input"
              value={formConfig.dimmedCostPerHour}
              onChange={(e) => setFormConfig({...formConfig, dimmedCostPerHour: parseFloat(e.target.value)})}
            />
          </div>
        </div>
        <button onClick={handleUpdate} className="btn btn-primary margin-top-4" disabled={saving}>
          <Save className="icon-sm" />
          {saving ? 'Saving...' : 'Update Lighting Config'}
        </button>
      </div>

      {/* Current Status */}
      <div className="section-spacing">
        <h3 className="subsection-title">Current Status</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Lighting Mode</div>
            <div className="stat-value text-4xl font-bold">
              <span className={lightingMode === 'Full Lighting' ? 'status-mode-full text-yellow-300' : 'status-mode-dimmed text-amber-500'}>
                {lightingMode}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Current Cost Rate</div>
            <div className="stat-value text-4xl font-bold text-green-400">${currentCostRate}</div>
            <div className="stat-change text-lg">/hour</div>
          </div>
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="section-spacing">
        <h3 className="subsection-title">Cost Analysis</h3>
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">Period</th>
                <th className="table-header">Without Optimization</th>
                <th className="table-header">With Optimization</th>
                <th className="table-header">Savings</th>
              </tr>
            </thead>
            <tbody className="table-body">
              <tr className="table-row">
                <td className="table-cell font-semibold">Today</td>
                <td className="table-cell cost-baseline">${standardDaily.toFixed(2)}</td>
                <td className="table-cell cost-current">${optimizedDaily.toFixed(2)}</td>
                <td className="table-cell cost-savings">${daySavings.toFixed(2)}</td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">This Month</td>
                <td className="table-cell cost-baseline">${(standardDaily * 30).toFixed(2)}</td>
                <td className="table-cell cost-current">${(optimizedDaily * 30).toFixed(2)}</td>
                <td className="table-cell cost-savings">${monthSavings.toFixed(2)}</td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">Annual Projection</td>
                <td className="table-cell cost-baseline">${(standardDaily * 365).toFixed(2)}</td>
                <td className="table-cell cost-current">${(optimizedDaily * 365).toFixed(2)}</td>
                <td className="table-cell cost-savings">${yearSavings.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
