import { useState, useEffect } from 'react';
import { DollarSign, Settings } from 'lucide-react';

export default function TotalCostImpact({ historicalData, config }) {
  const [systemCost, setSystemCost] = useState(35000);
  const [editingCost, setEditingCost] = useState(false);
  
  // Get config values or use defaults
  const hvacConfig = config?.hvac || {
    capacity: 200,
    baselineDevices: 15,
    minOccupancyForFull: 40,
    fullCostPerHour: 35,
    reducedCostPerHour: 12
  };

  const lightingConfig = config?.lighting || {
    minOccupancy: 5,
    fullCostPerHour: 8,
    dimmedCostPerHour: 2
  };

  const janitorialConfig = config?.janitorial || {
    dailyCleaningCost: 150,
    lowUsageThreshold: 20,
    highUsageThreshold: 100
  };

  // Calculate HVAC costs (matching HVACManagement.jsx exactly)
  let hvacYearBefore = 0;
  let hvacYearAfter = 0;
  
  if (historicalData?.snapshots) {
    const snapshots = historicalData.snapshots;
    let totalHoursFullWithout = 0;
    let totalHoursFullWith = 0;
    let totalHoursReduced = 0;

    snapshots.forEach(snap => {
      const devices = snap.devices?.active || 0;
      const estimatedPeople = Math.max(0, devices - hvacConfig.baselineDevices);
      
      // Without optimization: always full
      totalHoursFullWithout += 1;
      
      // With optimization: only full if above threshold
      if (estimatedPeople >= hvacConfig.minOccupancyForFull) {
        totalHoursFullWith += 1;
      } else {
        totalHoursReduced += 1;
      }
    });

    const costWithout = totalHoursFullWithout * hvacConfig.fullCostPerHour;
    const costWith = (totalHoursFullWith * hvacConfig.fullCostPerHour) + (totalHoursReduced * hvacConfig.reducedCostPerHour);

    // Extrapolate to annual
    const hoursInData = snapshots.length;
    const hoursInYear = 24 * 365;
    hvacYearBefore = (costWithout / hoursInData) * hoursInYear;
    hvacYearAfter = (costWith / hoursInData) * hoursInYear;
  }

  // Calculate Lighting costs (matching LightingManagement.jsx exactly)
  const hoursPerDay = 24;
  const lightingYearBefore = lightingConfig.fullCostPerHour * hoursPerDay * 365;
  const lightingYearAfter = (lightingConfig.fullCostPerHour * 10 + lightingConfig.dimmedCostPerHour * 14) * 365;

  // Calculate Janitorial costs (simplified estimation based on config)
  const janitorialYearBefore = janitorialConfig.dailyCleaningCost * 365; // Clean every day
  const janitorialYearAfter = janitorialConfig.dailyCleaningCost * 250; // Skip ~115 days per year with optimization

  // Total calculations
  const totalYearBefore = hvacYearBefore + lightingYearBefore + janitorialYearBefore;
  const totalYearAfter = hvacYearAfter + lightingYearAfter + janitorialYearAfter;
  const totalSavings = totalYearBefore - totalYearAfter;

  // Individual savings
  const hvacSavings = hvacYearBefore - hvacYearAfter;
  const lightingSavings = lightingYearBefore - lightingYearAfter;
  const janitorialSavings = janitorialYearBefore - janitorialYearAfter;

  // ROI calculations
  const paybackMonths = systemCost / (totalSavings / 12);
  const fiveYearROI = (totalSavings * 5) - systemCost;
  
  return (
    <div className="card">
      <h2 className="card-header">
        <DollarSign className="card-header-icon" />
        Total Cost Impact
      </h2>

      {/* Cost Breakdown Table */}
      <div className="section-spacing">
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">System</th>
                <th className="table-header">Annual Cost (Standard)</th>
                <th className="table-header">Annual Cost (Optimized)</th>
                <th className="table-header">Annual Savings</th>
                <th className="table-header">Savings %</th>
              </tr>
            </thead>
            <tbody className="table-body">
              <tr className="table-row">
                <td className="table-cell font-semibold">HVAC</td>
                <td className="table-cell cost-baseline">${hvacYearBefore.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-current">${hvacYearAfter.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">${hvacSavings.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">
                  {hvacYearBefore > 0 ? ((hvacSavings / hvacYearBefore) * 100).toFixed(1) : 0}%
                </td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">Lighting</td>
                <td className="table-cell cost-baseline">${lightingYearBefore.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-current">${lightingYearAfter.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">${lightingSavings.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">
                  {((lightingSavings / lightingYearBefore) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr className="table-row">
                <td className="table-cell font-semibold">Janitorial</td>
                <td className="table-cell cost-baseline">${janitorialYearBefore.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-current">${janitorialYearAfter.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">${janitorialSavings.toFixed(0).toLocaleString()}</td>
                <td className="table-cell cost-savings">
                  {((janitorialSavings / janitorialYearBefore) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr className="table-row-total">
                <td className="table-cell font-bold">TOTAL</td>
                <td className="table-cell font-bold cost-baseline">${totalYearBefore.toFixed(0).toLocaleString()}</td>
                <td className="table-cell font-bold cost-current">${totalYearAfter.toFixed(0).toLocaleString()}</td>
                <td className="table-cell font-bold cost-savings">
                  ${totalSavings.toFixed(0).toLocaleString()}
                </td>
                <td className="table-cell font-bold cost-savings">
                  {totalYearBefore > 0 ? ((totalSavings / totalYearBefore) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Analysis */}
      <div className="section-spacing">
        <h3 className="subsection-title">ROI Analysis</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              System Cost (One-time)
              <button 
                onClick={() => setEditingCost(!editingCost)} 
                className="ml-2 text-blue-400 hover:text-blue-300"
                title="Edit system cost"
              >
                <Settings className="w-4 h-4 inline" />
              </button>
            </div>
            {editingCost ? (
              <input
                type="number"
                className="input text-center"
                value={systemCost}
                onChange={(e) => setSystemCost(parseFloat(e.target.value) || 0)}
                onBlur={() => setEditingCost(false)}
                autoFocus
              />
            ) : (
              <div className="stat-value text-4xl font-bold text-purple-400">${systemCost.toLocaleString()}</div>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-label">Annual Savings</div>
            <div className="stat-value text-4xl font-bold cost-savings">${totalSavings.toFixed(0).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Payback Period</div>
            <div className="stat-value text-4xl font-bold text-cyan-400">{paybackMonths.toFixed(1)}</div>
            <div className="stat-change">months</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">5-Year ROI</div>
            <div className="stat-value text-4xl font-bold cost-savings">${fiveYearROI.toFixed(0).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
