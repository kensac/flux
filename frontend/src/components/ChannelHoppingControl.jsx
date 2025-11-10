 import { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { apiService } from '../services/api';

export default function ChannelHoppingControl() {
  const [config, setConfig] = useState({
    enabled: false,
    timeout_ms: 300,
    channels: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelsInput, setChannelsInput] = useState('');
  const [message, setMessage] = useState('');

  const channelPresets = {
    '2.4GHz (1,6,11)': [1, 6, 11],
    '2.4GHz All': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    '5GHz Low': [36, 40, 44, 48],
    '5GHz High': [149, 153, 157, 161, 165],
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await apiService.getChannelConfig();
      setConfig(data);
      setChannelsInput(data.channels?.join(',') || '');
    } catch (error) {
      console.error('Failed to load config:', error);
      setMessage('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage('');
      
      const channels = channelsInput
        .split(',')
        .map(ch => parseInt(ch.trim()))
        .filter(ch => !isNaN(ch) && ch > 0);

      const updateData = {
        enabled: config.enabled,
        timeout_ms: config.timeout_ms,
        channels: channels,
      };

      await apiService.updateChannelConfig(updateData);
      setMessage('Configuration updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset) => {
    const channels = channelPresets[preset];
    setChannelsInput(channels.join(','));
    setConfig({ ...config, channels });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-state">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-header">
        <Settings className="card-header-icon" />
        Channel Hopping Control
      </h2>

      <div className="channel-control-grid">
        {/* Enable/Disable Toggle */}
        <div className="toggle-label">
          <label className="form-label">Enable Channel Hopping</label>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`toggle-switch ${config.enabled ? 'toggle-switch-active' : 'toggle-switch-inactive'}`}
          >
            <span
              className={`toggle-switch-knob ${
                config.enabled ? 'toggle-switch-knob-active' : 'toggle-switch-knob-inactive'
              }`}
            />
          </button>
        </div>

        {/* Timeout */}
        <div className="form-group">
          <label className="form-label">
            Timeout (ms): {config.timeout_ms}
          </label>
          <input
            type="range"
            min="50"
            max="10000"
            step="50"
            value={config.timeout_ms}
            onChange={(e) => setConfig({ ...config, timeout_ms: parseInt(e.target.value) })}
            className="channel-slider"
          />
          <div className="channel-slider-labels">
            <span>50ms</span>
            <span>10000ms</span>
          </div>
        </div>

        {/* Channel Presets */}
        <div className="form-group">
          <label className="form-label">Channel Presets</label>
          <div className="channel-preset-grid">
            {Object.keys(channelPresets).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="btn btn-secondary text-sm"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Channels */}
        <div className="form-group">
          <label className="form-label">
            Channels (comma-separated)
          </label>
          <input
            type="text"
            value={channelsInput}
            onChange={(e) => setChannelsInput(e.target.value)}
            placeholder="e.g., 1,6,11"
            className="input w-full"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-icon"
          >
            <Save className="icon-sm" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          {message && (
            <span className={message.includes('success') ? 'message-success' : 'message-error'}>
              {message}
            </span>
          )}
        </div>

        {/* Status Display */}
        {config.enabled && (
          <div className="channel-status-panel">
            <div className="channel-status-info">
              <p>
                <span className="text-highlight">Status:</span>{' '}
                <span className="status-active">Active</span>
              </p>
              <p>
                <span className="text-highlight">Hopping Interval:</span> {config.timeout_ms}ms
              </p>
              <p>
                <span className="text-highlight">Active Channels:</span>{' '}
                {config.channels?.join(', ') || 'None'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
