import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export default function MetricsChart({ data, loading }) {
  const [selectedMetric, setSelectedMetric] = useState('devices');

  const formatChartData = () => {
    if (!data || !data.snapshots) return [];
    
    return data.snapshots
      .map(snapshot => ({
        timestamp: new Date(snapshot.timestamp).getTime(),
        time: format(new Date(snapshot.timestamp), 'h:mm a'),
        totalDevices: snapshot.devices.total,
        activeDevices: snapshot.devices.active,
        connectedDevices: snapshot.devices.connected,
        totalAPs: snapshot.access_points.total,
        activeAPs: snapshot.access_points.active,
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest to newest
  };

  const chartData = formatChartData();

  return (
    <div className="card">
      <div className="chart-header">
        <h2 className="card-header">
          <TrendingUp className="card-header-icon" />
          Historical Trends
        </h2>
        <div className="chart-toggle-group">
          <button
            onClick={() => setSelectedMetric('devices')}
            className={`btn ${selectedMetric === 'devices' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Devices
          </button>
          <button
            onClick={() => setSelectedMetric('aps')}
            className={`btn ${selectedMetric === 'aps' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Access Points
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading metrics...</div>
      ) : chartData.length === 0 ? (
        <div className="empty-state">No metrics data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="time" 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px'
              }}
            />
            {selectedMetric === 'devices' ? (
              <>
                <Line 
                  type="monotone" 
                  dataKey="activeDevices" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Active Devices"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="connectedDevices" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Connected Devices"
                  dot={false}
                />
              </>
            ) : (
              <>
                <Line 
                  type="monotone" 
                  dataKey="totalAPs" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Total APs"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="activeAPs" 
                  stroke="#eab308" 
                  strokeWidth={2}
                  name="Active APs"
                  dot={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
