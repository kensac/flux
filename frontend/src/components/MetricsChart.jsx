import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export default function MetricsChart({ data, loading }) {
  const [selectedMetric, setSelectedMetric] = useState('devices');
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousDataLengthRef = useRef(0);

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
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartData = formatChartData();

  useEffect(() => {
    if (chartData.length > 0 && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
    previousDataLengthRef.current = chartData.length;
  }, [chartData.length, hasAnimated]);

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

      {chartData.length === 0 && !loading ? (
        <div className="empty-state">No metrics data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart 
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="time"
              stroke="#737373"
              style={{ fontSize: '12px' }}
              domain={['dataMin', 'dataMax']}
            />
            <YAxis
              stroke="#737373"
              style={{ fontSize: '12px' }}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                color: '#171717',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  name="Active Devices"
                  dot={false}
                  isAnimationActive={!hasAnimated}
                  animationDuration={hasAnimated ? 300 : 1000}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="connectedDevices"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  name="Connected Devices"
                  dot={false}
                  isAnimationActive={!hasAnimated}
                  animationDuration={hasAnimated ? 300 : 1000}
                  animationEasing="ease-out"
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="totalAPs"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  name="Total APs"
                  dot={false}
                  isAnimationActive={!hasAnimated}
                  animationDuration={hasAnimated ? 300 : 1000}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="activeAPs"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  name="Active APs"
                  dot={false}
                  isAnimationActive={!hasAnimated}
                  animationDuration={hasAnimated ? 300 : 1000}
                  animationEasing="ease-out"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
