import { useState, useEffect } from 'react';
import { Shield, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function SecurityMonitoring({ stats, config, historicalData, onConfigUpdate }) {
  const [localConfig, setLocalConfig] = useState({
    afterHoursStart: '22:00',
    afterHoursEnd: '06:00',
    alertThreshold: 10
  });
  const [formConfig, setFormConfig] = useState({ ...localConfig });
  const [saving, setSaving] = useState(false);
  const [weeklyActivity, setWeeklyActivity] = useState([]);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setFormConfig(config);
    }
  }, [config]);

  // Generate weekly activity data (matches operations.html - uses random data for demo)
  useEffect(() => {
    if (localConfig) {
      // Get last 7 days
      const activity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString();
        const peakDevices = Math.floor(Math.random() * 20) + 5;
        const alertStatus = peakDevices > localConfig.alertThreshold ? 'Alert Triggered' : 'Normal';

        activity.push({
          date: dateStr,
          peakDevices,
          alertStatus
        });
      }

      setWeeklyActivity(activity);
    }
  }, [localConfig]);

  const detectedDevices = stats?.devices?.active || 0;
  
  // Determine current period
  const now = new Date();
  const currentHour = now.getHours();
  const startHour = parseInt(localConfig.afterHoursStart.split(':')[0]);
  const endHour = parseInt(localConfig.afterHoursEnd.split(':')[0]);
  
  let isAfterHours = false;
  if (startHour > endHour) {
    // Crosses midnight (e.g., 22:00 to 06:00)
    isAfterHours = currentHour >= startHour || currentHour < endHour;
  } else {
    isAfterHours = currentHour >= startHour && currentHour < endHour;
  }
  
  const period = isAfterHours ? 'After Hours' : 'Business Hours';
  
  // Security status
  let securityStatus = 'Normal';
  if (isAfterHours && detectedDevices > localConfig.alertThreshold) {
    securityStatus = 'Alert: High Activity';
  } else if (isAfterHours && detectedDevices > 0) {
    securityStatus = 'Monitoring';
  }

  const handleUpdate = async () => {
    setSaving(true);
    try {
      setLocalConfig(formConfig);
      await apiService.updateOperationsConfig({ security: formConfig });
      if (onConfigUpdate) onConfigUpdate();
      // Success - config saved to localStorage
    } catch (error) {
      console.error('Error saving security config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-header">
        <Shield className="card-header-icon" />
        Security Monitoring
      </h2>

      {/* Configuration */}
      <div className="section-spacing">
        <h3 className="subsection-title">Configuration</h3>
        <div className="config-form-grid-3">
          <div className="form-field">
            <label className="form-label">After-Hours Start Time</label>
            <input
              type="time"
              className="input"
              value={formConfig.afterHoursStart}
              onChange={(e) => setFormConfig({...formConfig, afterHoursStart: e.target.value})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">After-Hours End Time</label>
            <input
              type="time"
              className="input"
              value={formConfig.afterHoursEnd}
              onChange={(e) => setFormConfig({...formConfig, afterHoursEnd: e.target.value})}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Alert Threshold (devices)</label>
            <input
              type="number"
              className="input"
              value={formConfig.alertThreshold}
              onChange={(e) => setFormConfig({...formConfig, alertThreshold: parseInt(e.target.value)})}
            />
          </div>
        </div>
        <button onClick={handleUpdate} className="btn btn-primary margin-top-4" disabled={saving}>
          <Save className="icon-sm" />
          {saving ? 'Saving...' : 'Update Security Config'}
        </button>
      </div>

      {/* Current Status */}
      <div className="section-spacing">
        <h3 className="subsection-title">Current Status</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Current Hour</div>
            <div className="stat-value text-4xl font-bold text-cyan-400">
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Period</div>
            <div className="stat-value text-4xl font-bold">
              <span className={isAfterHours ? 'text-yellow-400' : 'text-green-400'}>
                {period}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Devices Detected</div>
            <div className="stat-value text-4xl font-bold text-purple-400">{detectedDevices}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className="stat-value text-4xl font-bold">
              <span className={
                securityStatus.includes('Alert') ? 'text-red-400' :
                securityStatus === 'Monitoring' ? 'text-yellow-400' :
                'text-green-400'
              }>
                {securityStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* After-Hours Activity */}
      <div className="section-spacing">
        <h3 className="subsection-title">After-Hours Activity (Last 7 Days)</h3>
        <div className="table-container">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Peak After-Hours Devices</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {weeklyActivity.length > 0 ? (
                weeklyActivity.map((day, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="table-cell">{day.date}</td>
                    <td className="table-cell">{day.peakDevices}</td>
                    <td className="table-cell">
                      <span className={day.alertStatus === 'Alert Triggered' ? 'status-mode-alert' : 'status-mode-normal'}>
                        {day.alertStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="table-row">
                  <td colSpan="3" className="table-cell text-center">Loading historical data...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
