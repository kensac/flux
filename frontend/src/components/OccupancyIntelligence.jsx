import { useMemo } from 'react';
import { TrendingUp, Clock, Users, AlertTriangle, Calendar, Award } from 'lucide-react';

export default function OccupancyIntelligence({ data, stats }) {
  const intelligence = useMemo(() => {
    if (!data?.snapshots || data.snapshots.length < 10) return null;

    const snapshots = [...data.snapshots].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Analyze patterns by hour
    const hourlyPatterns = {};
    snapshots.forEach(snapshot => {
      const hour = new Date(snapshot.timestamp).getHours();
      if (!hourlyPatterns[hour]) {
        hourlyPatterns[hour] = { total: 0, count: 0 };
      }
      hourlyPatterns[hour].total += snapshot.devices.active;
      hourlyPatterns[hour].count += 1;
    });

    const hourlyAverages = Object.entries(hourlyPatterns).map(([hour, data]) => ({
      hour: parseInt(hour),
      average: data.total / data.count
    }));

    // Find peak hours
    const peakHour = hourlyAverages.reduce((max, curr) =>
      curr.average > max.average ? curr : max
    , { hour: 0, average: 0 });

    const lowHour = hourlyAverages.reduce((min, curr) =>
      curr.average < min.average ? curr : min
    , { hour: 0, average: Infinity });

    // Calculate variance and stability
    const activeDeviceCounts = snapshots.map(s => s.devices.active);
    const mean = activeDeviceCounts.reduce((a, b) => a + b, 0) / activeDeviceCounts.length;
    const variance = activeDeviceCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / activeDeviceCounts.length;
    const stdDev = Math.sqrt(variance);
    const stability = stdDev < mean * 0.3 ? 'High' : stdDev < mean * 0.6 ? 'Medium' : 'Low';

    // Trend analysis
    const recentAvg = snapshots.slice(-10).reduce((sum, s) => sum + s.devices.active, 0) / 10;
    const olderAvg = snapshots.slice(0, Math.min(10, snapshots.length - 10)).reduce((sum, s) => sum + s.devices.active, 0) / Math.min(10, snapshots.length - 10);
    const trendPercent = ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1);

    // Calculate space utilization efficiency
    const utilizationScore = stats?.total_devices > 0
      ? ((stats.active_devices / stats.total_devices) * 100).toFixed(0)
      : 0;

    // Predict next hour
    const trend = recentAvg - olderAvg;
    const predictedNext = Math.max(0, Math.round(snapshots[snapshots.length - 1].devices.active + trend));

    return {
      peakHour: peakHour.hour,
      peakAverage: Math.round(peakHour.average),
      lowHour: lowHour.hour,
      lowAverage: Math.round(lowHour.average),
      stability,
      stdDev: stdDev.toFixed(1),
      trendPercent: Math.abs(trendPercent),
      trendDirection: parseFloat(trendPercent) >= 0 ? 'up' : 'down',
      utilizationScore,
      predictedNext,
      currentActive: snapshots[snapshots.length - 1].devices.active
    };
  }, [data, stats]);

  if (!intelligence) {
    return null;
  }

  const formatHour = (hour) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Intelligence Overview */}
      <div className="card">
        <h2 className="card-header">
          <Award className="card-header-icon" />
          Occupancy Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Peak Usage */}
          <div className="bg-white rounded-lg p-4 border border-primary-200">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-white rounded-lg ">
                <TrendingUp className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-xs font-semibold text-primary-700 bg-white px-2 py-1 rounded-md">
                Peak Period
              </span>
            </div>
            <p className="text-2xl font-bold text-primary-900 mt-3">{formatHour(intelligence.peakHour)}</p>
            <p className="text-sm text-primary-700 mt-1">
              Avg {intelligence.peakAverage} devices active
            </p>
            <p className="text-xs text-primary-600 mt-2">
              Highest occupancy period - plan staffing accordingly
            </p>
          </div>

          {/* Low Usage */}
          <div className="bg-white rounded-lg p-4 border border-success-200">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-white rounded-lg ">
                <Clock className="w-5 h-5 text-success-600" />
              </div>
              <span className="text-xs font-semibold text-success-700 bg-white px-2 py-1 rounded-md">
                Off-Peak
              </span>
            </div>
            <p className="text-2xl font-bold text-success-900 mt-3">{formatHour(intelligence.lowHour)}</p>
            <p className="text-sm text-success-700 mt-1">
              Avg {intelligence.lowAverage} devices active
            </p>
            <p className="text-xs text-success-600 mt-2">
              Lowest occupancy - ideal for maintenance windows
            </p>
          </div>

          {/* Traffic Stability */}
          <div className={`bg-white rounded-lg p-4 border ${
            intelligence.stability === 'High'
              ? 'border-success-200'
              : intelligence.stability === 'Medium'
              ? 'border-warning-200'
              : 'border-error-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 bg-white rounded-lg ">
                <Users className={`w-5 h-5 ${
                  intelligence.stability === 'High'
                    ? 'text-success-600'
                    : intelligence.stability === 'Medium'
                    ? 'text-warning-600'
                    : 'text-error-600'
                }`} />
              </div>
              <span className={`text-xs font-semibold bg-white px-2 py-1 rounded-md ${
                intelligence.stability === 'High'
                  ? 'text-success-700'
                  : intelligence.stability === 'Medium'
                  ? 'text-warning-700'
                  : 'text-error-700'
              }`}>
                Pattern Stability
              </span>
            </div>
            <p className={`text-2xl font-bold mt-3 ${
              intelligence.stability === 'High'
                ? 'text-success-900'
                : intelligence.stability === 'Medium'
                ? 'text-warning-900'
                : 'text-error-900'
            }`}>{intelligence.stability}</p>
            <p className={`text-sm mt-1 ${
              intelligence.stability === 'High'
                ? 'text-success-700'
                : intelligence.stability === 'Medium'
                ? 'text-warning-700'
                : 'text-error-700'
            }`}>
              Std Dev: ±{intelligence.stdDev} devices
            </p>
            <p className={`text-xs mt-2 ${
              intelligence.stability === 'High'
                ? 'text-success-600'
                : intelligence.stability === 'Medium'
                ? 'text-warning-600'
                : 'text-error-600'
            }`}>
              {intelligence.stability === 'High'
                ? 'Predictable patterns - reliable for planning'
                : intelligence.stability === 'Medium'
                ? 'Moderate variation - monitor trends'
                : 'High volatility - requires dynamic management'}
            </p>
          </div>
        </div>
      </div>

      {/* Predictive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Forecast */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Trend Analysis & Forecast
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Trend</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {intelligence.trendDirection === 'up' ? '↗' : '↘'} {intelligence.trendPercent}%
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                intelligence.trendDirection === 'up'
                  ? 'bg-success-100 text-success-600'
                  : 'bg-primary-100 text-primary-600'
              }`}>
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div>
                <p className="text-sm font-medium text-primary-700">Predicted Next Hour</p>
                <p className="text-2xl font-bold text-primary-900 mt-1">
                  {intelligence.predictedNext} devices
                </p>
                <p className="text-xs text-primary-600 mt-1">
                  Based on recent patterns
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-700">Current</p>
                <p className="text-xl font-semibold text-primary-900">
                  {intelligence.currentActive}
                </p>
              </div>
            </div>

            <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning-900">Capacity Planning Insight</p>
                  <p className="text-xs text-warning-700 mt-1">
                    {intelligence.trendDirection === 'up'
                      ? `Traffic increasing by ${intelligence.trendPercent}%. Consider scaling resources for peak periods.`
                      : `Traffic decreasing by ${intelligence.trendPercent}%. Opportunity to optimize operational costs.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Space Utilization */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Space Utilization Efficiency
          </h3>
          <div className="space-y-4">
            {/* Utilization Score */}
            <div className="relative">
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Current Utilization</span>
                <span className="text-3xl font-bold text-primary-600">{intelligence.utilizationScore}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    intelligence.utilizationScore > 80
                      ? 'bg-error-500'
                      : intelligence.utilizationScore > 60
                      ? 'bg-warning-500'
                      : 'bg-success-500'
                  }`}
                  style={{ width: `${intelligence.utilizationScore}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Utilization Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                <p className="text-xs font-medium text-success-700">Active Devices</p>
                <p className="text-xl font-bold text-success-900 mt-1">{stats?.active_devices || 0}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700">Total Discovered</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats?.total_devices || 0}</p>
              </div>
            </div>

            {/* Business Insight */}
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm font-semibold text-primary-900 mb-2">Business Impact</p>
              <p className="text-xs text-primary-700 leading-relaxed">
                {intelligence.utilizationScore > 80
                  ? 'High utilization detected. Your space is being used efficiently, maximizing ROI on facilities investment.'
                  : intelligence.utilizationScore > 50
                  ? 'Moderate utilization. Opportunity to optimize space allocation or increase occupancy during off-peak hours.'
                  : 'Low utilization detected. Consider consolidating spaces or adjusting operating hours to reduce overhead costs.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
