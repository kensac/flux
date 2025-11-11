import { useState, useEffect } from 'react';
import { Sparkles, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function JanitorialServices({ stats, config, historicalData, onConfigUpdate }) {
  const [localConfig, setLocalConfig] = useState({
    dailyCleaningCost: 150,
    lowUsageThreshold: 20,
    highUsageThreshold: 150
  });
  const [formConfig, setFormConfig] = useState({ ...localConfig });
  const [saving, setSaving] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState([]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setFormConfig(config);
    }
  }, [config]);

  // Process historical data to generate weekly schedule (like operations.html)
  useEffect(() => {
    if (historicalData?.snapshots && localConfig) {
      const snapshots = historicalData.snapshots;
      const baseline = 15; // Use same baseline as HVAC

      // Group by day
      const dailyOccupancy = {};
      snapshots.forEach(snap => {
        const date = new Date(snap.timestamp).toLocaleDateString();
        if (!dailyOccupancy[date]) {
          dailyOccupancy[date] = [];
        }
        dailyOccupancy[date].push((snap.devices?.active || 0) - baseline);
      });

      // Calculate average per day for last 7 days
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const schedule = [];
      
      Object.keys(dailyOccupancy).slice(-7).forEach((date, idx) => {
        const avgOccupancy = Math.round(
          dailyOccupancy[date].reduce((a, b) => a + b, 0) / dailyOccupancy[date].length
        );
        const dayName = days[idx % 7];

        let optimizedAction = 'Standard Clean';
        let optimizedCost = localConfig.dailyCleaningCost;

        if (avgOccupancy < localConfig.lowUsageThreshold) {
          optimizedAction = 'Skip Clean';
          optimizedCost = 0;
        } else if (avgOccupancy > localConfig.highUsageThreshold) {
          optimizedAction = 'Deep Clean';
          optimizedCost = localConfig.dailyCleaningCost * 1.5;
        }

        schedule.push({
          day: dayName,
          avgOccupancy,
          standardCost: localConfig.dailyCleaningCost,
          optimizedAction,
          optimizedCost
        });
      });

      setWeeklySchedule(schedule);
    }
  }, [historicalData, localConfig]);

  const baselineDevices = 15;
  const detectedDevices = stats?.devices?.active || 0;
  const estimatedPeople = Math.max(0, detectedDevices - baselineDevices);
  
  // Determine recommendation
  let recommendation = 'Standard cleaning - Regular schedule';
  if (estimatedPeople < localConfig.lowUsageThreshold) {
    recommendation = 'Low usage - Skip cleaning';
  } else if (estimatedPeople > localConfig.highUsageThreshold) {
    recommendation = 'High usage - Schedule deep clean';
  }

  // Calculate costs from weekly schedule
  const standardWeekCost = weeklySchedule.reduce((sum, day) => sum + day.standardCost, 0) || (localConfig.dailyCleaningCost * 4);
  const optimizedWeekCost = weeklySchedule.reduce((sum, day) => sum + day.optimizedCost, 0) || (localConfig.dailyCleaningCost * 6);
  
  const weeklySavings = standardWeekCost - optimizedWeekCost;
  const monthlySavings = weeklySavings * 4.3;
  const annualSavings = weeklySavings * 52;

  const monthlyCost = standardWeekCost * 4.3;
  const monthlyOptimized = optimizedWeekCost * 4.3;
  const annualCost = standardWeekCost * 52;
  const annualOptimized = optimizedWeekCost * 52;

  const handleUpdate = async () => {
    setSaving(true);
    try {
      setLocalConfig(formConfig);
      await apiService.updateOperationsConfig({ janitorial: formConfig });
      if (onConfigUpdate) onConfigUpdate();
      // Success - config saved to localStorage
    } catch (error) {
      console.error('Error saving janitorial config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Sparkles className="card-header-icon" />
        Janitorial Services
      </h2>

      {/* Configuration */}
      <div className="section-spacing">
        <h3 className="subsection-title">Configuration</h3>
        <div className="config-form-grid-3">
          <div className="form-field">
            <label className="form-label">Daily Cleaning Cost</label>
            <input
              type="number"
              className="input"
              value={formConfig.dailyCleaningCost}
              onChange={(e) => setFormConfig({...formConfig, dailyCleaningCost: parseFloat(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Low Usage Threshold (skip)</label>
            <input
              type="number"
              className="input"
              value={formConfig.lowUsageThreshold}
              onChange={(e) => setFormConfig({...formConfig, lowUsageThreshold: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">High Usage Threshold (extra)</label>
            <input
              type="number"
              className="input"
              value={formConfig.highUsageThreshold}
              onChange={(e) => setFormConfig({...formConfig, highUsageThreshold: parseInt(e.target.value)})}
            />
          </div>
        </div>
        <button onClick={handleUpdate} className="btn btn-primary margin-top-4" disabled={saving}>
          <Save className="icon-sm" />
          {saving ? 'Saving...' : 'Update Cleaning Config'}
        </button>
      </div>

      {/* Today's Recommendation */}
      <div className="section-spacing">
        <h3 className="subsection-title">Today's Recommendation</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Occupancy Today</div>
            <div className="stat-value text-4xl font-bold text-blue-400">{estimatedPeople}</div>
            <div className="stat-change">people</div>
          </div>
          <div className="stat-card col-span-2">
            <div className="stat-label">Recommended Action</div>
            <div className="stat-value text-4xl font-bold">
              <span className={
                recommendation.includes('Skip') ? 'text-green-400' :
                recommendation.includes('Extra') || recommendation.includes('Deep') ? 'text-red-400' :
                'text-yellow-400'
              }>
                {recommendation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Analysis */}
      <div className="section-spacing">
        <h3 className="subsection-title">Weekly Analysis</h3>
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">Day</th>
                <th className="table-header">Avg Occupancy</th>
                <th className="table-header">Standard Schedule</th>
                <th className="table-header">Optimized Schedule</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {weeklySchedule.length > 0 ? (
                weeklySchedule.map((day, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="table-cell font-semibold">{day.day}</td>
                    <td className="table-cell">{day.avgOccupancy}</td>
                    <td className="table-cell cost-baseline">${day.standardCost.toFixed(2)}</td>
                    <td className="table-cell cost-current">{day.optimizedAction} (${day.optimizedCost.toFixed(2)})</td>
                  </tr>
                ))
              ) : (
                <tr className="table-row">
                  <td colSpan="4" className="table-cell text-center">Loading historical data...</td>
                </tr>
              )}
            </tbody>
          </table>
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
                <th className="table-header">Standard Schedule</th>
                <th className="table-header">Optimized Schedule</th>
                <th className="table-header">Savings</th>
              </tr>
            </thead>
            <tbody className="table-body">
              <tr className="table-row">
                <td className="table-cell font-semibold">This Week</td>
                <td className="table-cell cost-baseline">${standardWeekCost.toFixed(2)}</td>
                <td className="table-cell cost-current">${optimizedWeekCost.toFixed(2)}</td>
                <td className="table-cell cost-savings">${weeklySavings.toFixed(2)}</td>
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
