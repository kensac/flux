import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

export default function NetworkAnalytics({ devices, accessPoints }) {
  const vendorDistribution = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const vendorCounts = devices.reduce((acc, device) => {
      const vendor = device.vendor || 'Unknown';
      acc[vendor] = (acc[vendor] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(vendorCounts)
      .map(([vendor, count]) => ({ vendor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [devices]);

  const connectionStatus = useMemo(() => {
    if (!devices || devices.length === 0) return [];

    const connected = devices.filter(d => d.connected).length;
    const probe = devices.length - connected;

    return [
      { name: 'Connected', value: connected, color: '#16a34a' },
      { name: 'Probe Requests', value: probe, color: '#737373' },
    ];
  }, [devices]);

  const channelDistribution = useMemo(() => {
    if (!accessPoints || accessPoints.length === 0) return [];

    const channelCounts = accessPoints.reduce((acc, ap) => {
      const channel = ap.channel || 'Unknown';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(channelCounts)
      .map(([channel, count]) => ({ channel: `Ch ${channel}`, count }))
      .sort((a, b) => parseInt(a.channel.split(' ')[1]) - parseInt(b.channel.split(' ')[1]));
  }, [accessPoints]);

  const encryptionStats = useMemo(() => {
    if (!accessPoints || accessPoints.length === 0) return [];

    const secure = accessPoints.filter(ap => ap.encryption && ap.encryption !== 'Open').length;
    const open = accessPoints.length - secure;

    return [
      { name: 'Secured Networks', value: secure, color: '#16a34a' },
      { name: 'Open Networks', value: open, color: '#ef4444' },
    ];
  }, [accessPoints]);

  return (
    <div className="space-y-6">
      {/* Device Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Distribution */}
        <div className="card">
          <h3 className="card-header">
            <BarChart3 className="card-header-icon" />
            Device Vendor Distribution
          </h3>
          {vendorDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="vendor"
                  stroke="#737373"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    color: '#171717',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No device data available</div>
          )}
        </div>

        {/* Connection Status */}
        <div className="card">
          <h3 className="card-header">
            <PieChartIcon className="card-header-icon" />
            Connection Status
          </h3>
          {connectionStatus.length > 0 && connectionStatus.some(s => s.value > 0) ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={connectionStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {connectionStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      color: '#171717',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-4">
                {connectionStatus.map((status, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                    <span className="text-sm text-gray-700">{status.name}: <span className="font-semibold">{status.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">No connection data available</div>
          )}
        </div>
      </div>

      {/* Network Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Distribution */}
        <div className="card">
          <h3 className="card-header">
            <BarChart3 className="card-header-icon" />
            WiFi Channel Distribution
          </h3>
          {channelDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="channel" stroke="#737373" style={{ fontSize: '12px' }} />
                <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    color: '#171717',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No channel data available</div>
          )}
        </div>

        {/* Encryption Status */}
        <div className="card">
          <h3 className="card-header">
            <PieChartIcon className="card-header-icon" />
            Network Security Status
          </h3>
          {encryptionStats.length > 0 && encryptionStats.some(s => s.value > 0) ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={encryptionStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {encryptionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      color: '#171717',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-4">
                {encryptionStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }}></div>
                    <span className="text-sm text-gray-700">{stat.name}: <span className="font-semibold">{stat.value}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">No encryption data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
