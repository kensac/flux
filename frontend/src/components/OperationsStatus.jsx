import { Users, Activity } from 'lucide-react';

export default function OperationsStatus({ stats, loading, config }) {
  if (loading) {
    return <div className="loading-state">Loading occupancy data...</div>;
  }

  // Use HVAC config values or defaults
  const baselineDevices = config?.hvac?.baselineDevices || 15;
  const buildingCapacity = config?.hvac?.buildingCapacity || 200;
  
  const detectedDevices = stats?.devices?.active || 0;
  const estimatedPeople = Math.max(0, detectedDevices - baselineDevices);
  const utilization = buildingCapacity > 0 
    ? ((estimatedPeople / buildingCapacity) * 100).toFixed(1) 
    : 0;

  return (
    <div className="card">
      <h2 className="card-header">
        <Users className="card-header-icon" />
        Current Occupancy Status
      </h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Current Occupancy</div>
          <div className="stat-value text-5xl font-bold text-blue-400">{estimatedPeople}</div>
          <div className="stat-change text-lg">people</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Building Capacity</div>
          <div className="stat-value text-5xl font-bold text-slate-300">{buildingCapacity}</div>
          <div className="stat-change text-lg">maximum</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Utilization</div>
          <div className={`stat-value text-5xl font-bold ${
            utilization > 75 ? 'text-red-400' : 
            utilization > 40 ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {utilization}%
          </div>
          <div className={`stat-change text-lg font-semibold ${
            utilization > 75 ? 'text-red-400' : 
            utilization > 40 ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {utilization > 75 ? 'High' : utilization > 40 ? 'Medium' : 'Low'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Detected Devices</div>
          <div className="stat-value text-5xl font-bold text-purple-400">{detectedDevices}</div>
          <div className="stat-change text-lg">
            <Activity className="icon-inline" /> active
          </div>
        </div>
      </div>
    </div>
  );
}
