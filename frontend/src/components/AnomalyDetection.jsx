import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, TrendingDown, Shield } from 'lucide-react';

export default function AnomalyDetection({ data, devices, accessPoints }) {
  const anomalies = useMemo(() => {
    if (!data?.snapshots || data.snapshots.length < 20) return null;

    const snapshots = [...data.snapshots].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const detected = [];

    // Calculate baseline statistics
    const activeDeviceCounts = snapshots.map(s => s.devices.active);
    const mean = activeDeviceCounts.reduce((a, b) => a + b, 0) / activeDeviceCounts.length;
    const variance = activeDeviceCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / activeDeviceCounts.length;
    const stdDev = Math.sqrt(variance);

    // Detect traffic spikes (3 standard deviations)
    const recent = snapshots[snapshots.length - 1];
    if (recent.devices.active > mean + (3 * stdDev)) {
      detected.push({
        type: 'spike',
        severity: 'high',
        title: 'Unusual Traffic Spike Detected',
        description: `Current activity (${recent.devices.active} devices) is ${((recent.devices.active - mean) / mean * 100).toFixed(0)}% above normal baseline.`,
        recommendation: 'Monitor for security threats or unexpected events. Verify all devices are authorized.',
        icon: AlertTriangle,
        color: 'error'
      });
    }

    // Detect traffic drops
    if (recent.devices.active < mean - (2 * stdDev) && mean > 5) {
      detected.push({
        type: 'drop',
        severity: 'medium',
        title: 'Significant Traffic Drop',
        description: `Current activity is ${((mean - recent.devices.active) / mean * 100).toFixed(0)}% below normal levels.`,
        recommendation: 'Check for network connectivity issues or service disruptions.',
        icon: TrendingDown,
        color: 'warning'
      });
    }

    // Check for unsecured networks
    if (accessPoints && accessPoints.length > 0) {
      const unsecuredCount = accessPoints.filter(ap => !ap.encryption || ap.encryption === 'Open').length;
      const unsecuredPercent = (unsecuredCount / accessPoints.length * 100).toFixed(0);

      if (unsecuredCount > 0) {
        detected.push({
          type: 'security',
          severity: unsecuredPercent > 25 ? 'high' : 'medium',
          title: 'Unsecured Networks Detected',
          description: `${unsecuredCount} access point${unsecuredCount > 1 ? 's' : ''} (${unsecuredPercent}%) ${unsecuredCount > 1 ? 'are' : 'is'} broadcasting without encryption.`,
          recommendation: 'Enable WPA2/WPA3 encryption on all access points to protect sensitive data.',
          icon: Shield,
          color: unsecuredPercent > 25 ? 'error' : 'warning'
        });
      }
    }

    // Detect rapid change rate
    if (snapshots.length >= 10) {
      const recentChanges = [];
      for (let i = snapshots.length - 10; i < snapshots.length - 1; i++) {
        const change = Math.abs(snapshots[i + 1].devices.active - snapshots[i].devices.active);
        recentChanges.push(change);
      }
      const avgChange = recentChanges.reduce((a, b) => a + b, 0) / recentChanges.length;

      if (avgChange > mean * 0.3) {
        detected.push({
          type: 'volatility',
          severity: 'medium',
          title: 'High Network Volatility',
          description: `Device count fluctuating by an average of ${avgChange.toFixed(1)} devices per interval.`,
          recommendation: 'Investigate potential connectivity issues or user behavior patterns.',
          icon: AlertTriangle,
          color: 'warning'
        });
      }
    }

    // Check for unusual vendor concentration
    if (devices && devices.length >= 5) {
      const vendorCounts = {};
      devices.forEach(device => {
        const vendor = device.vendor || 'Unknown';
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
      });

      const topVendor = Object.entries(vendorCounts).reduce((max, [vendor, count]) =>
        count > max.count ? { vendor, count } : max
      , { vendor: '', count: 0 });

      const concentration = (topVendor.count / devices.length * 100).toFixed(0);

      if (concentration > 70 && devices.length > 10) {
        detected.push({
          type: 'concentration',
          severity: 'low',
          title: 'High Vendor Concentration',
          description: `${concentration}% of devices are from ${topVendor.vendor}.`,
          recommendation: 'Consider diversifying device ecosystem for better resilience and reduced vendor lock-in.',
          icon: AlertTriangle,
          color: 'warning'
        });
      }
    }

    // If no anomalies, return all-clear status
    if (detected.length === 0) {
      detected.push({
        type: 'normal',
        severity: 'none',
        title: 'No Anomalies Detected',
        description: 'Network activity is within normal parameters. All systems operating as expected.',
        recommendation: 'Continue monitoring for any changes in baseline patterns.',
        icon: CheckCircle,
        color: 'success'
      });
    }

    return {
      detected,
      totalAnomalies: detected.filter(a => a.type !== 'normal').length,
      criticalCount: detected.filter(a => a.severity === 'high').length,
      baseline: mean.toFixed(1),
      stdDev: stdDev.toFixed(1)
    };
  }, [data, devices, accessPoints]);

  if (!anomalies) {
    return null;
  }

  const getSeverityBadge = (severity) => {
    const styles = {
      high: 'bg-error-100 text-error-700 border-error-200',
      medium: 'bg-warning-100 text-warning-700 border-warning-200',
      low: 'bg-primary-100 text-primary-700 border-primary-200',
      none: 'bg-success-100 text-success-700 border-success-200'
    };

    const labels = {
      high: 'Critical',
      medium: 'Warning',
      low: 'Info',
      none: 'Normal'
    };

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[severity]}`}>
        {labels[severity]}
      </span>
    );
  };

  const getColorClasses = (color) => {
    const colors = {
      error: {
        bg: 'bg-error-50',
        border: 'border-error-200',
        icon: 'text-error-600',
        title: 'text-error-900',
        text: 'text-error-700'
      },
      warning: {
        bg: 'bg-warning-50',
        border: 'border-warning-200',
        icon: 'text-warning-600',
        title: 'text-warning-900',
        text: 'text-warning-700'
      },
      success: {
        bg: 'bg-success-50',
        border: 'border-success-200',
        icon: 'text-success-600',
        title: 'text-success-900',
        text: 'text-success-700'
      }
    };
    return colors[color] || colors.warning;
  };

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div className={`card ${
        anomalies.criticalCount > 0
          ? 'border-l-4 border-l-error-500 bg-error-50/30'
          : anomalies.totalAnomalies > 0
          ? 'border-l-4 border-l-warning-500 bg-warning-50/30'
          : 'border-l-4 border-l-success-500 bg-success-50/30'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
              {anomalies.totalAnomalies === 0 ? (
                <CheckCircle className="w-5 h-5 text-success-600" />
              ) : (
                <AlertTriangle className={`w-5 h-5 ${
                  anomalies.criticalCount > 0 ? 'text-error-600' : 'text-warning-600'
                }`} />
              )}
              Anomaly Detection
            </h2>
            <p className="text-sm text-gray-600">
              {anomalies.totalAnomalies === 0
                ? 'All systems normal'
                : `${anomalies.totalAnomalies} ${anomalies.totalAnomalies === 1 ? 'anomaly' : 'anomalies'} detected`}
              {' • Baseline: '}{anomalies.baseline} devices (±{anomalies.stdDev})
            </p>
          </div>
          {anomalies.criticalCount > 0 && (
            <div className="bg-error-100 border border-error-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-error-700">
                {anomalies.criticalCount} Critical
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Anomaly Cards */}
      <div className="grid grid-cols-1 gap-4">
        {anomalies.detected.map((anomaly, idx) => {
          const Icon = anomaly.icon;
          const colors = getColorClasses(anomaly.color);

          return (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${colors.bg} ${colors.border} transition-all hover:`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 bg-white rounded-lg ">
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`text-base font-semibold ${colors.title}`}>
                      {anomaly.title}
                    </h3>
                    {getSeverityBadge(anomaly.severity)}
                  </div>
                  <p className={`text-sm ${colors.text} mb-3`}>
                    {anomaly.description}
                  </p>
                  <div className="bg-white rounded-md p-3 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Recommended Action:</p>
                    <p className="text-xs text-gray-600">
                      {anomaly.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
