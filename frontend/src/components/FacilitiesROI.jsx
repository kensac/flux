import { DollarSign, TrendingUp, Calendar, Target, Award, Calculator } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

export default function FacilitiesROI({ stats, historicalData }) {
  // Calculate comprehensive ROI metrics
  const avgOccupancy = stats?.devices?.active || 15;
  const squareFootage = 10000; // Example: 10,000 sq ft facility

  // Cost per square foot benchmarks
  const TRADITIONAL_COST_PER_SQFT = 8.50; // Annual operating cost
  const WITH_FLUX_COST_PER_SQFT = 5.50; // With optimization

  // Calculate savings
  const traditionalAnnualCost = squareFootage * TRADITIONAL_COST_PER_SQFT;
  const fluxAnnualCost = squareFootage * WITH_FLUX_COST_PER_SQFT;
  const annualSavings = traditionalAnnualCost - fluxAnnualCost;
  const monthlySavings = annualSavings / 12;

  // Implementation costs
  const hardwareCost = 5000; // Flux hardware
  const installationCost = 2000; // Setup and configuration
  const totalImplementation = hardwareCost + installationCost;

  // ROI calculations
  const monthsToROI = Math.ceil(totalImplementation / monthlySavings);
  const threeYearSavings = (annualSavings * 3) - totalImplementation;
  const fiveYearSavings = (annualSavings * 5) - totalImplementation;
  const roiPercent = ((fiveYearSavings / totalImplementation) * 100).toFixed(0);

  // Breakdown by category
  const savingsBreakdown = [
    { category: 'HVAC Optimization', annual: annualSavings * 0.40, percent: 40 },
    { category: 'Lighting Control', annual: annualSavings * 0.30, percent: 30 },
    { category: 'Demand Charges', annual: annualSavings * 0.15, percent: 15 },
    { category: 'Janitorial Efficiency', annual: annualSavings * 0.10, percent: 10 },
    { category: 'Maintenance Optimization', annual: annualSavings * 0.05, percent: 5 }
  ];

  // Projected savings over time
  const projectedSavings = [
    { year: 'Year 1', savings: annualSavings - totalImplementation, cumulative: annualSavings - totalImplementation },
    { year: 'Year 2', savings: annualSavings, cumulative: (annualSavings * 2) - totalImplementation },
    { year: 'Year 3', savings: annualSavings, cumulative: threeYearSavings },
    { year: 'Year 4', savings: annualSavings, cumulative: (annualSavings * 4) - totalImplementation },
    { year: 'Year 5', savings: annualSavings, cumulative: fiveYearSavings }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* ROI Executive Summary */}
      <div className="card bg-white border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator className="w-6 h-6" />
              Facilities Cost Optimization ROI
            </h2>
            <p className="text-sm text-gray-700">Comprehensive return on investment analysis</p>
          </div>
          <div className="text-right bg-white rounded-lg p-3 border-2 border-gray-300 ">
            <p className="text-xs font-semibold text-gray-600">5-Year ROI</p>
            <p className="text-4xl font-bold text-gray-900">{roiPercent}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4  border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-semibold text-gray-600">Monthly Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlySavings)}</p>
            <p className="text-xs text-gray-600 mt-1">Recurring cost reduction</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-gray-600">Payback Period</span>
            </div>
            <p className="text-2xl font-bold text-primary-900">{monthsToROI} mo</p>
            <p className="text-xs text-gray-600 mt-1">Time to break even</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-semibold text-gray-600">3-Year Net Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(threeYearSavings)}</p>
            <p className="text-xs text-gray-600 mt-1">After implementation</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-semibold text-gray-600">5-Year Net Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(fiveYearSavings)}</p>
            <p className="text-xs text-gray-600 mt-1">Total value delivered</p>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-600" />
            Investment Breakdown
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">One-Time Implementation</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Flux Hardware & Sensors</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(hardwareCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Installation & Setup</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(installationCost)}</span>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Total Investment</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(totalImplementation)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-gray-900 mb-3">Annual Operating Cost Comparison</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Traditional Management</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(traditionalAnnualCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">With Flux Platform</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(fluxAnnualCost)}</span>
                </div>
                <div className="pt-2 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900">Annual Savings</span>
                    <span className="text-lg font-bold text-primary-600">{formatCurrency(annualSavings)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings by Category */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-700" />
            Savings Breakdown by Category
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={savingsBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis type="number" stroke="#737373" style={{ fontSize: '11px' }} />
              <YAxis dataKey="category" type="category" width={150} stroke="#737373" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="annual" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {savingsBreakdown.slice(0, 3).map((item, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-gray-200 text-center">
                <p className="text-xs font-medium text-gray-700 truncate">{item.category.split(' ')[0]}</p>
                <p className="text-lg font-bold text-gray-900">{item.percent}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projected Savings Over Time */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          5-Year Cumulative Savings Projection
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectedSavings} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="year" stroke="#737373" style={{ fontSize: '12px' }} />
            <YAxis
              stroke="#737373"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="savings"
              stroke="#0284c7"
              strokeWidth={2.5}
              name="Annual Savings"
              dot={{ fill: '#0284c7', r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#22c55e"
              strokeWidth={2.5}
              name="Cumulative Net Savings"
              dot={{ fill: '#22c55e', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Value Proposition */}
      <div className="card bg-white">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Why This Investment Makes Sense</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="w-4 h-4 text-gray-700" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Fast Payback</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              With a {monthsToROI}-month payback period, you'll recoup your investment quickly and start seeing pure savings in under a year.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-primary-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Compounding Value</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Savings compound year over year. After 5 years, you'll have saved {formatCurrency(fiveYearSavings)} with minimal ongoing costs.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <Award className="w-4 h-4 text-warning-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Future-Proof</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              As energy costs rise, your savings grow. Plus, continuous platform updates mean you're always optimized.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
