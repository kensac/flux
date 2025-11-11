import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Activity } from 'lucide-react';
import { useMemo } from 'react';

export default function NetworkInsights({ data, stats }) {
  const insights = useMemo(() => {
    if (!data?.snapshots || data.snapshots.length < 2) return null;

    const snapshots = [...data.snapshots].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[Math.max(0, snapshots.length - 10)];

    // Calculate trends
    const deviceTrend = latest.devices.active - previous.devices.active;
    const deviceTrendPercent = previous.devices.active > 0
      ? ((deviceTrend / previous.devices.active) * 100).toFixed(1)
      : 0;

    const apTrend = latest.access_points.active - previous.access_points.active;

    // Calculate averages
    const avgDevices = (snapshots.reduce((sum, s) => sum + s.devices.active, 0) / snapshots.length).toFixed(0);
    const avgAPs = (snapshots.reduce((sum, s) => sum + s.access_points.active, 0) / snapshots.length).toFixed(0);

    // Peak detection
    const peakDevices = Math.max(...snapshots.map(s => s.devices.active));
    const peakTime = snapshots.find(s => s.devices.active === peakDevices)?.timestamp;

    // Calculate utilization rate
    const currentUtilization = stats?.total_devices > 0
      ? ((stats.active_devices / stats.total_devices) * 100).toFixed(1)
      : 0;

    return {
      deviceTrend,
      deviceTrendPercent,
      apTrend,
      avgDevices,
      avgAPs,
      peakDevices,
      peakTime: peakTime ? new Date(peakTime).toLocaleTimeString() : 'N/A',
      currentUtilization,
    };
  }, [data, stats]);

  if (!insights) {
    return null;
  }

  const insightCards = [
    {
      title: 'Network Activity',
      value: insights.deviceTrend >= 0 ? 'Increasing' : 'Decreasing',
      detail: `${Math.abs(insights.deviceTrendPercent)}% ${insights.deviceTrend >= 0 ? 'increase' : 'decrease'} in active devices`,
      icon: insights.deviceTrend >= 0 ? TrendingUp : TrendingDown,
      iconColor: insights.deviceTrend >= 0 ? 'text-success-600' : 'text-warning-600',
      bgColor: insights.deviceTrend >= 0 ? 'bg-success-50' : 'bg-warning-50',
    },
    {
      title: 'Average Active Devices',
      value: insights.avgDevices,
      detail: 'Average over monitoring period',
      icon: Activity,
      iconColor: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Peak Activity',
      value: insights.peakDevices,
      detail: `Occurred at ${insights.peakTime}`,
      icon: TrendingUp,
      iconColor: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      title: 'Network Utilization',
      value: `${insights.currentUtilization}%`,
      detail: 'Active vs total discovered devices',
      icon: insights.currentUtilization > 70 ? AlertCircle : CheckCircle,
      iconColor: insights.currentUtilization > 70 ? 'text-warning-600' : 'text-success-600',
      bgColor: insights.currentUtilization > 70 ? 'bg-warning-50' : 'bg-success-50',
    },
  ];

  return (
    <div className="card">
      <h2 className="card-header">
        <Activity className="card-header-icon" />
        Network Insights
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insightCards.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                <Icon className={`w-5 h-5 ${insight.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 mb-1">{insight.title}</p>
                <p className="text-xl font-semibold text-gray-900 mb-0.5">{insight.value}</p>
                <p className="text-xs text-gray-500">{insight.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
