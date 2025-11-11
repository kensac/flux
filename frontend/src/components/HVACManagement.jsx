import { useState, useEffect } from 'react';
import { Wind, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function HVACManagement({ stats, config, historicalData, onConfigUpdate }) {
  const [localConfig, setLocalConfig] = useState({
    buildingCapacity: 200,
    baselineDevices: 15,
    minOccupancyForFull: 40,
    fullCostPerHour: 35,
    reducedCostPerHour: 12
  });
  const [formConfig, setFormConfig] = useState({ ...localConfig });
  const [saving, setSaving] = useState(false);

  // Update local config when prop config changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setFormConfig(config);
    }
  }, [config]);

  const detectedDevices = stats?.devices?.active || 0;
  const estimatedPeople = Math.max(0, detectedDevices - localConfig.baselineDevices);
  
  // Determine HVAC mode based on occupancy (use localConfig for calculations)
  const hvacMode = estimatedPeople >= localConfig.minOccupancyForFull ? 'Full Operation' : 'Reduced Operation';
  const currentCostRate = hvacMode === 'Full Operation' ? localConfig.fullCostPerHour : localConfig.reducedCostPerHour;

  // Calculate costs using historical data (like operations.html does)
  let optimizedCost = 0;
  let standardCost = 0;

  if (historicalData?.snapshots && historicalData.snapshots.length > 0) {
    historicalData.snapshots.forEach(snap => {
      const occupancy = (snap.devices?.active || 0) - localConfig.baselineDevices;

      // Standard: always full HVAC
      standardCost += localConfig.fullCostPerHour;

      // Optimized: based on occupancy
      if (occupancy >= localConfig.minOccupancyForFull) {
        optimizedCost += localConfig.fullCostPerHour;
      } else if (occupancy > 0) {
        optimizedCost += localConfig.reducedCostPerHour;
      } else {
        optimizedCost += localConfig.reducedCostPerHour * 0.3;
      }
    });
  } else {
    // Fallback if no historical data
    const dailyCost = currentCostRate * 8;
    optimizedCost = dailyCost * 22;
    standardCost = localConfig.fullCostPerHour * 8 * 22;
  }

  const monthlySavings = standardCost - optimizedCost;
  const dailySavings = monthlySavings / 30;
  const annualSavings = monthlySavings * 12;

  // Daily costs
  const dailyCost = localConfig.fullCostPerHour * 24;
  const dailyOptimized = dailyCost - dailySavings;

  // Monthly costs
  const monthlyCost = standardCost;
  const monthlyOptimized = optimizedCost;

  // Annual costs
  const annualCost = standardCost * 12;
  const annualOptimized = optimizedCost * 12;

  const handleUpdate = async () => {
    setSaving(true);
    try {
      // Update localConfig with formConfig values
      setLocalConfig(formConfig);
      await apiService.updateOperationsConfig({ hvac: formConfig });
      if (onConfigUpdate) onConfigUpdate();
      // Success - config saved to localStorage
    } catch (error) {
      console.error('Error saving HVAC config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Wind className="card-header-icon" />
        HVAC Management
      </h2>

      {/* Configuration Section */}
      <div className="section-spacing">
        <h3 className="subsection-title">Configuration</h3>
        <div className="config-form-grid-2">
          <div className="form-field">
            <label className="form-label">Building Capacity</label>
            <input
              type="number"
              className="input"
              value={formConfig.buildingCapacity}
              onChange={(e) => setFormConfig({...formConfig, buildingCapacity: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Baseline Devices (IoT)</label>
            <input
              type="number"
              className="input"
              value={formConfig.baselineDevices}
              onChange={(e) => setFormConfig({...formConfig, baselineDevices: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Min Occupancy for Full HVAC</label>
            <input
              type="number"
              className="input"
              value={formConfig.minOccupancyForFull}
              onChange={(e) => setFormConfig({...formConfig, minOccupancyForFull: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">HVAC Cost per Hour (Full)</label>
            <input
              type="number"
              className="input"
              value={formConfig.fullCostPerHour}
              onChange={(e) => setFormConfig({...formConfig, fullCostPerHour: parseFloat(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">HVAC Cost per Hour (Reduced)</label>
            <input
              type="number"
              className="input"
              value={formConfig.reducedCostPerHour}
              onChange={(e) => setFormConfig({...formConfig, reducedCostPerHour: parseFloat(e.target.value)})}
            />
          </div>
        </div>
        <button onClick={handleUpdate} className="btn btn-primary btn-icon margin-top-4" disabled={saving}>
          <Save className="icon-sm" />
          {saving ? 'Saving...' : 'Update HVAC Config'}
        </button>
      </div>

      {/* Current Status */}
      <div className="section-spacing">
        <h3 className="subsection-title">Current Status</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Detected Devices</div>
            <div className="stat-value text-4xl font-bold text-cyan-400">{detectedDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Estimated People</div>
            <div className="stat-value text-4xl font-bold text-blue-400">{estimatedPeople}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">HVAC Mode</div>
            <div className="stat-value text-3xl font-bold">
              <span className={hvacMode === 'Full Operation' ? 'status-mode-full text-red-400' : 'status-mode-reduced text-yellow-400'}>
                {hvacMode}
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
                <td className="table-cell cost-baseline">${dailyCost.toFixed(2)}</td>
                <td className="table-cell cost-current">${dailyOptimized.toFixed(2)}</td>
                <td className="table-cell cost-savings">${dailySavings.toFixed(2)}</td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">This Month</td>
                <td className="table-cell cost-baseline">${monthlyCost.toFixed(2)}</td>
                <td className="table-cell cost-current">${monthlyOptimized.toFixed(2)}</td>
                <td className="table-cell cost-savings">${monthlySavings.toFixed(2)}</td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">Annual Projection</td>
                <td className="table-cell cost-baseline">${annualCost.toFixed(2)}</td>
                <td className="table-cell cost-current">${annualOptimized.toFixed(2)}</td>
                <td className="table-cell cost-savings">${annualSavings.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
