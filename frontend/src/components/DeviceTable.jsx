import { formatDistanceToNow } from 'date-fns';
import { Signal } from 'lucide-react';

export default function DeviceTable({ devices, loading }) {
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
        <Signal className="card-header-icon" />
        Active Devices
      </h2>
      {loading ? (
        <div className="loading-state">Loading devices...</div>
      ) : devices.length === 0 ? (
        <div className="empty-state">No devices detected</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header-cell">MAC Address</th>
                <th className="table-header-cell">Vendor</th>
                <th className="table-header-cell">RSSI (Avg)</th>
                <th className="table-header-cell">Packets</th>
                <th className="table-header-cell">Data (KB)</th>
                <th className="table-header-cell">Status</th>
                <th className="table-header-cell">Last Seen</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {devices.map((device) => {
                const avgRSSI = getAverageRSSI(device.rssi_values);
                const signalClass = getSignalStrengthClass(avgRSSI);
                return (
                  <tr key={device.mac_address} className="table-row">
                    <td className="table-cell-mono">{device.mac_address}</td>
                    <td className="table-cell text-info">
                      {device.vendor || 'Unknown'}
                    </td>
                    <td className={`table-cell ${signalClass}`}>
                      {avgRSSI !== 'N/A' ? `${avgRSSI} dBm` : avgRSSI}
                    </td>
                    <td className="table-cell">{device.packet_count}</td>
                    <td className="table-cell">{(device.data_bytes / 1024).toFixed(2)}</td>
                    <td className="table-cell">
                      <span className={`badge ${device.connected ? 'badge-connected' : 'badge-probe'}`}>
                        {device.connected ? 'Connected' : 'Probe'}
                      </span>
                    </td>
                    <td className="table-cell-muted">
                      {formatDistanceToNow(new Date(device.last_seen), {
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
