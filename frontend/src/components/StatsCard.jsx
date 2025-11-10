import { Activity, Wifi, Radio } from 'lucide-react';

export default function StatsCard({ stats, loading }) {
  const statItems = [
    {
      label: 'Total Devices',
      value: stats?.total_devices ?? '-',
      icon: Activity,
      color: 'text-blue-400',
    },
    {
      label: 'Active Devices',
      value: stats?.active_devices ?? '-',
      icon: Activity,
      color: 'text-green-400',
    },
    {
      label: 'Total APs',
      value: stats?.total_aps ?? '-',
      icon: Wifi,
      color: 'text-purple-400',
    },
    {
      label: 'Active APs',
      value: stats?.active_aps ?? '-',
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
                <p className="stat-card-value">
                  {loading ? '...' : item.value}
                </p>
              </div>
              <Icon className={`stat-card-icon ${item.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
