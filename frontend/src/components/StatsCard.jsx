import { useState, useEffect } from 'react';
import { Activity, Wifi, Radio } from 'lucide-react';

export default function StatsCard({ stats, loading }) {
  const [displayStats, setDisplayStats] = useState({
    total_devices: 0,
    active_devices: 0,
    total_aps: 0,
    active_aps: 0,
  });

  useEffect(() => {
    if (stats && !loading) {
      setDisplayStats({
        total_devices: stats.total_devices ?? 0,
        active_devices: stats.active_devices ?? 0,
        total_aps: stats.total_aps ?? 0,
        active_aps: stats.active_aps ?? 0,
      });
    }
  }, [stats, loading]);

  const statItems = [
    {
      label: 'Total Devices',
      value: displayStats.total_devices,
      icon: Activity,
      color: 'text-blue-400',
    },
    {
      label: 'Active Devices',
      value: displayStats.active_devices,
      icon: Activity,
      color: 'text-green-400',
    },
    {
      label: 'Total APs',
      value: displayStats.total_aps,
      icon: Wifi,
      color: 'text-purple-400',
    },
    {
      label: 'Active APs',
      value: displayStats.active_aps,
      icon: Radio,
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="stats-grid">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-card-content">
              <div className="stat-card-info">
                <p className="stat-card-label">{item.label}</p>
                <p className="stat-card-value">{item.value}</p>
              </div>
              <Icon className={`stat-card-icon ${item.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
