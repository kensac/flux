import { useMemo } from 'react';
import { Calendar } from 'lucide-react';

export default function ActivityHeatmap({ data }) {
  const heatmapData = useMemo(() => {
    if (!data?.snapshots || data.snapshots.length === 0) return null;

    // Create a 24x7 grid (hours x days of week)
    const grid = Array(7).fill(null).map(() => Array(24).fill({ count: 0, total: 0 }));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Aggregate data by day of week and hour
    data.snapshots.forEach(snapshot => {
      const date = new Date(snapshot.timestamp);
      const day = date.getDay(); // 0-6
      const hour = date.getHours(); // 0-23

      if (!grid[day][hour].count) {
        grid[day][hour] = { count: 0, total: 0 };
      }

      grid[day][hour].count += 1;
      grid[day][hour].total += snapshot.devices.active;
    });

    // Calculate averages
    const averages = grid.map(dayData =>
      dayData.map(hourData =>
        hourData.count > 0 ? hourData.total / hourData.count : 0
      )
    );

    // Find max for normalization
    const allValues = averages.flat().filter(v => v > 0);
    const maxValue = Math.max(...allValues, 1);
    const minValue = Math.min(...allValues.filter(v => v > 0), 0);

    return {
      grid: averages,
      days,
      hours: Array.from({ length: 24 }, (_, i) => i),
      maxValue,
      minValue,
      hasData: allValues.length > 0
    };
  }, [data]);

  if (!heatmapData || !heatmapData.hasData) {
    return (
      <div className="card">
        <h2 className="card-header">
          <Calendar className="card-header-icon" />
          Weekly Activity Heatmap
        </h2>
        <div className="empty-state">Not enough data for heatmap visualization</div>
      </div>
    );
  }

  const getColor = (value) => {
    if (value === 0) return 'bg-gray-100';

    const intensity = (value - heatmapData.minValue) / (heatmapData.maxValue - heatmapData.minValue);

    if (intensity > 0.8) return 'bg-primary-600';
    if (intensity > 0.6) return 'bg-primary-500';
    if (intensity > 0.4) return 'bg-primary-400';
    if (intensity > 0.2) return 'bg-primary-300';
    return 'bg-primary-200';
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="card-header mb-0">
            <Calendar className="card-header-icon" />
            Weekly Activity Heatmap
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Average device activity by day and hour
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Low</span>
          <div className="flex gap-1">
            <div className="w-4 h-4 rounded bg-primary-200"></div>
            <div className="w-4 h-4 rounded bg-primary-300"></div>
            <div className="w-4 h-4 rounded bg-primary-400"></div>
            <div className="w-4 h-4 rounded bg-primary-500"></div>
            <div className="w-4 h-4 rounded bg-primary-600"></div>
          </div>
          <span className="text-xs text-gray-600">High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour labels */}
          <div className="flex mb-2">
            <div className="w-12"></div>
            {heatmapData.hours.map((hour, idx) => (
              idx % 2 === 0 && (
                <div key={hour} className="flex-1 min-w-[28px] text-center">
                  <span className="text-xs text-gray-500">{formatHour(hour)}</span>
                </div>
              )
            ))}
          </div>

          {/* Heatmap grid */}
          {heatmapData.days.map((day, dayIdx) => (
            <div key={day} className="flex items-center mb-1.5">
              <div className="w-12 text-right pr-3">
                <span className="text-sm font-medium text-gray-700">{day}</span>
              </div>
              <div className="flex gap-1 flex-1">
                {heatmapData.grid[dayIdx].map((value, hourIdx) => (
                  <div
                    key={`${day}-${hourIdx}`}
                    className={`flex-1 min-w-[28px] h-8 rounded transition-all hover:ring-2 hover:ring-primary-400 hover:scale-110 cursor-pointer ${getColor(value)}`}
                    title={`${day} ${formatHour(hourIdx)}: ${value.toFixed(1)} avg devices`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
          <p className="text-xs font-medium text-primary-700">Peak Activity</p>
          <p className="text-lg font-semibold text-primary-900 mt-1">
            {heatmapData.maxValue.toFixed(1)} devices
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700">Average Activity</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {((heatmapData.maxValue + heatmapData.minValue) / 2).toFixed(1)} devices
          </p>
        </div>
        <div className="p-3 bg-success-50 rounded-lg border border-success-200">
          <p className="text-xs font-medium text-success-700">Off-Peak</p>
          <p className="text-lg font-semibold text-success-900 mt-1">
            {heatmapData.minValue.toFixed(1)} devices
          </p>
        </div>
      </div>
    </div>
  );
}
