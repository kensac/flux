import { useMemo } from 'react';
import { Zap, TrendingDown, DollarSign, Leaf, Award, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function EnergyOptimization({ stats, historicalData }) {
  const energyMetrics = useMemo(() => {
    if (!historicalData?.snapshots || historicalData.snapshots.length === 0) {
      return null;
    }

    const snapshots = [...historicalData.snapshots].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Energy consumption model (simplified)
    const HVAC_WATTS_PER_PERSON = 250; // Avg HVAC load per occupant
    const LIGHTING_WATTS_PER_PERSON = 50; // Avg lighting load per occupant
    const BASE_LOAD_KW = 5; // Base building load in kW
    const COST_PER_KWH = 0.12; // Average commercial electricity rate

    const currentOccupancy = stats?.devices?.active || 0;

    // Calculate energy consumption scenarios
    const traditionalEnergy = (currentOccupancy * (HVAC_WATTS_PER_PERSON + LIGHTING_WATTS_PER_PERSON) / 1000) + BASE_LOAD_KW;
    const optimizedEnergy = traditionalEnergy * 0.65; // 35% savings with smart controls
    const currentSavings = traditionalEnergy - optimizedEnergy;

    // Daily and annual projections
    const dailySavingsKWh = currentSavings * 12; // 12 hours avg operational
    const dailySavingsCost = dailySavingsKWh * COST_PER_KWH;
    const annualSavingsKWh = dailySavingsKWh * 260; // 260 business days
    const annualSavingsCost = annualSavingsKWh * COST_PER_KWH;

    // Carbon footprint (0.92 lbs CO2 per kWh avg)
    const carbonSavedLbs = annualSavingsKWh * 0.92;
    const carbonSavedTons = carbonSavedLbs / 2000;

    // Peak demand reduction
    const peakDemandReduction = currentSavings * 1.5; // Peak hours have higher impact
    const demandChargeSavings = peakDemandReduction * 15 * 12; // $15/kW demand charge

    // Chart data
    const chartData = snapshots.slice(-48).map(snapshot => {
      const occupancy = snapshot.devices.active;
      const traditional = (occupancy * (HVAC_WATTS_PER_PERSON + LIGHTING_WATTS_PER_PERSON) / 1000) + BASE_LOAD_KW;
      const optimized = traditional * 0.65;

      return {
        timestamp: new Date(snapshot.timestamp).getTime(),
        time: new Date(snapshot.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        traditional: traditional.toFixed(2),
        optimized: optimized.toFixed(2),
        savings: (traditional - optimized).toFixed(2)
      };
    });

    // Efficiency grade
    const efficiencyPercent = ((currentSavings / traditionalEnergy) * 100).toFixed(0);
    let efficiencyGrade = 'C';
    if (efficiencyPercent >= 40) efficiencyGrade = 'A';
    else if (efficiencyPercent >= 30) efficiencyGrade = 'B';

    return {
      traditionalEnergy: traditionalEnergy.toFixed(2),
      optimizedEnergy: optimizedEnergy.toFixed(2),
      currentSavings: currentSavings.toFixed(2),
      dailySavingsKWh: dailySavingsKWh.toFixed(0),
      dailySavingsCost: dailySavingsCost.toFixed(2),
      annualSavingsKWh: annualSavingsKWh.toFixed(0),
      annualSavingsCost: annualSavingsCost.toFixed(0),
      carbonSavedTons: carbonSavedTons.toFixed(2),
      peakDemandReduction: peakDemandReduction.toFixed(2),
      demandChargeSavings: demandChargeSavings.toFixed(0),
      efficiencyPercent,
      efficiencyGrade,
      chartData,
      currentOccupancy
    };
  }, [stats, historicalData]);

  if (!energyMetrics) {
    return (
      <div className="card">
        <h2 className="card-header">
          <Zap className="card-header-icon" />
          Energy Optimization
        </h2>
        <div className="empty-state">Loading energy data...</div>
      </div>
    );
  }

  const getGradeColor = (grade) => {
    const colors = {
      'A': { bg: 'bg-success-100', text: 'text-success-700', border: 'border-success-300' },
      'B': { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-300' },
      'C': { bg: 'bg-warning-100', text: 'text-warning-700', border: 'border-warning-300' }
    };
    return colors[grade] || colors.C;
  };

  const gradeColors = getGradeColor(energyMetrics.efficiencyGrade);

  return (
    <div className="space-y-6">
      {/* Energy Efficiency Overview */}
      <div className="card bg-white border-success-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-success-900 mb-1 flex items-center gap-2">
              <Zap className="w-6 h-6" />
              Energy Optimization Intelligence
            </h2>
            <p className="text-sm text-success-700">Real-time occupancy-based energy management</p>
          </div>
          <div className={`px-4 py-2 rounded-lg border-2 ${gradeColors.bg} ${gradeColors.border}`}>
            <p className="text-xs font-semibold text-gray-600">Efficiency Grade</p>
            <p className={`text-4xl font-bold ${gradeColors.text}`}>{energyMetrics.efficiencyGrade}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4  border border-success-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Current Savings</span>
            </div>
            <p className="text-2xl font-bold text-success-900">
              {energyMetrics.currentSavings} <span className="text-sm">kW</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">{energyMetrics.efficiencyPercent}% reduction</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-success-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Daily Cost Savings</span>
            </div>
            <p className="text-2xl font-bold text-success-900">${energyMetrics.dailySavingsCost}</p>
            <p className="text-xs text-gray-600 mt-1">{energyMetrics.dailySavingsKWh} kWh saved</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-success-200">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Annual Savings</span>
            </div>
            <p className="text-2xl font-bold text-success-900">${(energyMetrics.annualSavingsCost / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-600 mt-1">{(energyMetrics.annualSavingsKWh / 1000).toFixed(0)}K kWh/year</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-success-200">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Carbon Reduced</span>
            </div>
            <p className="text-2xl font-bold text-success-900">{energyMetrics.carbonSavedTons}</p>
            <p className="text-xs text-gray-600 mt-1">tons CO₂/year</p>
          </div>
        </div>
      </div>

      {/* Real-time Energy Consumption Chart */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-600" />
          Real-Time Energy Consumption
        </h3>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-error-500"></div>
              <span className="text-xs text-gray-600">Traditional (No Optimization)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success-500"></div>
              <span className="text-xs text-gray-600">Smart Optimized</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Current Occupancy</p>
            <p className="text-lg font-bold text-gray-900">{energyMetrics.currentOccupancy} people</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={energyMetrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="time"
              stroke="#737373"
              style={{ fontSize: '11px' }}
            />
            <YAxis
              stroke="#737373"
              style={{ fontSize: '11px' }}
              label={{ value: 'kW', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey="traditional"
              stackId="1"
              stroke="#ef4444"
              fill="#fee2e2"
              fillOpacity={0.6}
              name="Traditional"
            />
            <Area
              type="monotone"
              dataKey="optimized"
              stackId="2"
              stroke="#22c55e"
              fill="#dcfce7"
              fillOpacity={0.8}
              name="Optimized"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Charge Savings */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Peak Demand Management
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm font-medium text-primary-700 mb-2">Peak Demand Reduction</p>
              <p className="text-3xl font-bold text-primary-900">{energyMetrics.peakDemandReduction} kW</p>
              <p className="text-xs text-primary-600 mt-2">
                Avoiding peak demand charges during high-occupancy periods
              </p>
            </div>

            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
              <p className="text-sm font-medium text-success-700 mb-2">Annual Demand Charge Savings</p>
              <p className="text-3xl font-bold text-success-900">${energyMetrics.demandChargeSavings}</p>
              <p className="text-xs text-success-600 mt-2">
                Based on typical $15/kW commercial demand charges
              </p>
            </div>

            <div className="p-3 bg-warning-50 rounded-lg border border-warning-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-warning-900">Smart Load Management</p>
                  <p className="text-xs text-warning-700 mt-1">
                    System automatically reduces non-essential loads during peak demand events
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sustainability Impact */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-success-600" />
            Environmental Impact
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
              <p className="text-sm font-medium text-success-700 mb-2">Carbon Footprint Reduction</p>
              <p className="text-3xl font-bold text-success-900">{energyMetrics.carbonSavedTons} tons</p>
              <p className="text-xs text-success-600 mt-2">CO₂ equivalent per year</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-success-100 rounded-lg border border-success-200 text-center">
                <p className="text-xs font-medium text-success-700">Equivalent to</p>
                <p className="text-2xl font-bold text-success-900 mt-1">
                  {Math.round(energyMetrics.carbonSavedTons * 120)}
                </p>
                <p className="text-xs text-success-600">trees planted</p>
              </div>
              <div className="p-3 bg-success-100 rounded-lg border border-success-200 text-center">
                <p className="text-xs font-medium text-success-700">Or removing</p>
                <p className="text-2xl font-bold text-success-900 mt-1">
                  {Math.round(energyMetrics.carbonSavedTons / 4.6)}
                </p>
                <p className="text-xs text-success-600">cars off road</p>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-xs font-semibold text-primary-900 mb-2">ESG Compliance Benefits</p>
              <ul className="space-y-1">
                <li className="text-xs text-primary-700 flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span>Supports corporate sustainability goals and reporting</span>
                </li>
                <li className="text-xs text-primary-700 flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span>Enhances green building certifications (LEED, BREEAM)</span>
                </li>
                <li className="text-xs text-primary-700 flex items-start gap-2">
                  <span className="text-primary-600">•</span>
                  <span>Demonstrates environmental stewardship to stakeholders</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
