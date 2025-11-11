import { useMemo } from 'react';
import { DollarSign, TrendingUp, Zap, Users, Target, Award } from 'lucide-react';

export default function BusinessIntelligence({ data, stats }) {
  const businessMetrics = useMemo(() => {
    if (!data?.snapshots || data.snapshots.length < 10) return null;

    const snapshots = [...data.snapshots].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Calculate monitoring coverage
    const avgActive = snapshots.reduce((sum, s) => sum + s.devices.active, 0) / snapshots.length;
    const monitoringCoverage = stats?.total_devices > 0
      ? ((avgActive / stats.total_devices) * 100).toFixed(1)
      : 0;

    // Calculate uptime (percentage of time with active monitoring)
    const activeSnapshots = snapshots.filter(s => s.devices.active > 0).length;
    const uptimePercent = ((activeSnapshots / snapshots.length) * 100).toFixed(2);

    // Cost savings calculations (estimates)
    const COST_PER_DEVICE_TRADITIONAL = 150; // Traditional monitoring per device/year
    const COST_PER_DEVICE_FLUX = 25; // Your solution per device/year
    const estimatedAnnualSavings = (stats?.total_devices || 0) * (COST_PER_DEVICE_TRADITIONAL - COST_PER_DEVICE_FLUX);

    // Efficiency metrics
    const dataPoints = snapshots.length;
    const monitoringPeriodHours = (new Date(snapshots[snapshots.length - 1].timestamp) - new Date(snapshots[0].timestamp)) / (1000 * 60 * 60);
    const dataPointsPerHour = monitoringPeriodHours > 0 ? (dataPoints / monitoringPeriodHours).toFixed(1) : 0;

    // Space optimization potential
    const peakDevices = Math.max(...snapshots.map(s => s.devices.active));
    const avgDevices = avgActive;
    const spaceUtilizationGap = peakDevices > 0 ? ((peakDevices - avgDevices) / peakDevices * 100).toFixed(0) : 0;

    // ROI calculation (simplified)
    const IMPLEMENTATION_COST = 5000; // One-time setup cost estimate
    const monthsToROI = estimatedAnnualSavings > 0
      ? Math.ceil((IMPLEMENTATION_COST / estimatedAnnualSavings) * 12)
      : 0;

    // Network health score (composite metric)
    const coverageScore = parseFloat(monitoringCoverage) / 100;
    const uptimeScore = parseFloat(uptimePercent) / 100;
    const utilizationScore = Math.min(parseFloat(monitoringCoverage) / 80, 1); // Target 80%
    const healthScore = ((coverageScore * 0.4 + uptimeScore * 0.3 + utilizationScore * 0.3) * 100).toFixed(0);

    return {
      monitoringCoverage,
      uptimePercent,
      estimatedAnnualSavings,
      dataPointsPerHour,
      spaceUtilizationGap,
      monthsToROI,
      healthScore,
      avgDevices: avgDevices.toFixed(1),
      peakDevices,
      totalDevices: stats?.total_devices || 0
    };
  }, [data, stats]);

  if (!businessMetrics) {
    return null;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getHealthColor = (score) => {
    if (score >= 80) return { bg: 'bg-success-50', border: 'border-success-200', text: 'text-success-700', value: 'text-success-900' };
    if (score >= 60) return { bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-700', value: 'text-warning-900' };
    return { bg: 'bg-error-50', border: 'border-error-200', text: 'text-error-700', value: 'text-error-900' };
  };

  const healthColors = getHealthColor(businessMetrics.healthScore);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="card bg-white border-primary-200">
        <h2 className="text-xl font-bold text-primary-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6" />
          Executive Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 ">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-primary-700">Network Health</span>
            </div>
            <p className={`text-3xl font-bold ${healthColors.value}`}>
              {businessMetrics.healthScore}
              <span className="text-lg">/100</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">Composite health score</p>
          </div>

          <div className="bg-white rounded-lg p-4 ">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-success-700">Est. Annual Savings</span>
            </div>
            <p className="text-3xl font-bold text-success-900">
              {formatCurrency(businessMetrics.estimatedAnnualSavings)}
            </p>
            <p className="text-xs text-gray-600 mt-1">vs. traditional monitoring</p>
          </div>

          <div className="bg-white rounded-lg p-4 ">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-primary-700">ROI Timeline</span>
            </div>
            <p className="text-3xl font-bold text-primary-900">
              {businessMetrics.monthsToROI}
              <span className="text-lg"> mo</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">Time to break even</p>
          </div>

          <div className="bg-white rounded-lg p-4 ">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-warning-600" />
              <span className="text-xs font-semibold text-warning-700">System Uptime</span>
            </div>
            <p className="text-3xl font-bold text-warning-900">
              {businessMetrics.uptimePercent}%
            </p>
            <p className="text-xs text-gray-600 mt-1">Monitoring availability</p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Analysis */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success-600" />
            Cost & ROI Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-600">Monitored Devices</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{businessMetrics.totalDevices}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Avg Active</p>
                <p className="text-lg font-semibold text-gray-700">{businessMetrics.avgDevices}</p>
              </div>
            </div>

            <div className="p-4 bg-success-50 rounded-lg border border-success-200">
              <p className="text-sm font-semibold text-success-900 mb-3">Annual Cost Comparison</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-success-700">Traditional Monitoring</span>
                  <span className="text-sm font-semibold text-success-900">
                    {formatCurrency(businessMetrics.totalDevices * 150)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-success-700">Flux Platform</span>
                  <span className="text-sm font-semibold text-success-900">
                    {formatCurrency(businessMetrics.totalDevices * 25)}
                  </span>
                </div>
                <div className="pt-2 border-t border-success-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-success-700">You Save</span>
                    <span className="text-lg font-bold text-success-900">
                      {formatCurrency(businessMetrics.estimatedAnnualSavings)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-xs font-medium text-primary-700 mb-2">3-Year Projected Savings</p>
              <p className="text-2xl font-bold text-primary-900">
                {formatCurrency(businessMetrics.estimatedAnnualSavings * 3)}
              </p>
              <p className="text-xs text-primary-600 mt-1">
                Estimated cumulative cost reduction over 36 months
              </p>
            </div>
          </div>
        </div>

        {/* Operational Efficiency */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            Operational Efficiency
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-primary-700">Monitoring Coverage</p>
                <p className="text-2xl font-bold text-primary-900">{businessMetrics.monitoringCoverage}%</p>
              </div>
              <div className="h-3 bg-primary-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${businessMetrics.monitoringCoverage}%` }}
                />
              </div>
              <p className="text-xs text-primary-600 mt-2">
                Percentage of discovered devices actively monitored
              </p>
            </div>

            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <p className="text-sm font-semibold text-warning-900 mb-2">Space Optimization Potential</p>
              <p className="text-3xl font-bold text-warning-900">{businessMetrics.spaceUtilizationGap}%</p>
              <p className="text-xs text-warning-700 mt-1">
                Capacity gap between peak and average usage
              </p>
              <p className="text-xs text-warning-600 mt-2 bg-white rounded p-2">
                Opportunity to optimize facility costs by right-sizing spaces based on actual utilization patterns
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700">Data Collection Rate</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {businessMetrics.dataPointsPerHour}
                  <span className="text-sm font-normal">/hr</span>
                </p>
              </div>
              <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                <p className="text-xs font-medium text-success-700">Peak Capacity</p>
                <p className="text-xl font-bold text-success-900 mt-1">
                  {businessMetrics.peakDevices}
                  <span className="text-sm font-normal"> dev</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Insights */}
      <div className="card bg-white">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          Strategic Business Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="w-4 h-4 text-primary-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Capacity Planning</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Current {businessMetrics.monitoringCoverage}% utilization provides room for growth. Infrastructure can support{' '}
              {Math.round(businessMetrics.totalDevices * (100 / parseFloat(businessMetrics.monitoringCoverage)))} devices before capacity expansion needed.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <DollarSign className="w-4 h-4 text-success-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Budget Optimization</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              {businessMetrics.spaceUtilizationGap}% gap between peak and average usage suggests potential to consolidate resources and reduce operational overhead by up to{' '}
              {Math.round(businessMetrics.spaceUtilizationGap * 0.6)}%.
            </p>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200 ">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-warning-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-warning-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Scalability</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              With {businessMetrics.uptimePercent}% system uptime and {businessMetrics.dataPointsPerHour} data points/hour, platform demonstrates enterprise-grade reliability for mission-critical operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
