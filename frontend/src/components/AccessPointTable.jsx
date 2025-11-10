import { formatDistanceToNow } from 'date-fns';
import { Wifi } from 'lucide-react';

export default function AccessPointTable({ accessPoints, loading }) {
  const getAverageRSSI = (rssiValues) => {
    if (!rssiValues || rssiValues.length === 0) return 'N/A';
    const avg = rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length;
    return Math.round(avg);
  };

  const getSignalStrengthClass = (rssi) => {
    if (rssi === 'N/A') return 'signal-unknown';
    if (rssi > -50) return 'signal-excellent';
    if (rssi > -70) return 'signal-good';
    return 'signal-weak';
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Wifi className="card-header-icon" />
        Access Points
      </h2>
      {loading ? (
        <div className="loading-state">Loading access points...</div>
      ) : accessPoints.length === 0 ? (
        <div className="empty-state">No access points detected</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header-cell">SSID</th>
                <th className="table-header-cell">BSSID</th>
                <th className="table-header-cell">Channel</th>
                <th className="table-header-cell">RSSI (Avg)</th>
                <th className="table-header-cell">Beacons</th>
                <th className="table-header-cell">Encryption</th>
                <th className="table-header-cell">Last Seen</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {accessPoints.map((ap) => {
                const avgRSSI = getAverageRSSI(ap.rssi_values);
                const signalClass = getSignalStrengthClass(avgRSSI);
                return (
                  <tr key={ap.bssid} className="table-row">
                    <td className="table-cell text-highlight">
                      {ap.ssid || '<Hidden>'}
                    </td>
                    <td className="table-cell-mono">{ap.bssid}</td>
                    <td className="table-cell">
                      <span className="badge-channel">
                        {ap.channel}
                      </span>
                    </td>
                    <td className={`table-cell ${signalClass}`}>
                      {avgRSSI !== 'N/A' ? `${avgRSSI} dBm` : avgRSSI}
                    </td>
                    <td className="table-cell">{ap.beacon_count}</td>
                    <td className="table-cell">
                      <span className={`badge ${ap.encryption ? 'badge-secure' : 'badge-open'}`}>
                        {ap.encryption || 'Open'}
                      </span>
                    </td>
                    <td className="table-cell-muted">
                      {formatDistanceToNow(new Date(ap.last_seen), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
