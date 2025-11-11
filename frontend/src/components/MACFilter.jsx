import { useState, useEffect } from 'react';
import { Shield, Edit2, Save, X, Check } from 'lucide-react';

export default function MACFilter({ devices, onFilterChange }) {
  const [allowlistMode, setAllowlistMode] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [allowlist, setAllowlist] = useState([]);
  const [textInput, setTextInput] = useState('');

  // Load allowlist from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('flux_allowlist');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAllowlist(parsed);
        setTextInput(parsed.join('\n'));
      } catch (e) {
        console.error('Failed to parse allowlist:', e);
      }
    }
  }, []);

  // Apply filter whenever allowlistMode or allowlist changes
  useEffect(() => {
    if (allowlistMode && allowlist.length > 0) {
      const filtered = devices.filter(device =>
        allowlist.includes(device.mac_address)
      );
      onFilterChange(filtered);
    } else {
      onFilterChange(devices);
    }
  }, [allowlistMode, allowlist, devices, onFilterChange]);

  const handleSaveAllowlist = () => {
    const macs = textInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    setAllowlist(macs);
    localStorage.setItem('flux_allowlist', JSON.stringify(macs));
    setShowEditor(false);
  };

  const handleToggleEditor = () => {
    if (!showEditor) {
      setTextInput(allowlist.join('\n'));
    }
    setShowEditor(!showEditor);
  };

  const filteredCount = allowlistMode && allowlist.length > 0
    ? devices.filter(d => allowlist.includes(d.mac_address)).length
    : devices.length;

  return (
    <div className="card bg-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-gray-200 rounded">
            <Shield className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">MAC Address Filtering</h3>
            <p className="text-sm text-gray-600">
              {allowlistMode
                ? `Showing ${filteredCount} approved devices`
                : `${allowlist.length} MAC addresses configured`}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleEditor}
          className={`btn ${showEditor ? 'btn-secondary' : 'btn-primary'} btn-icon`}
        >
          {showEditor ? (
            <>
              <X className="icon-sm" />
              Cancel
            </>
          ) : (
            <>
              <Edit2 className="icon-sm" />
              Edit Allowlist
            </>
          )}
        </button>
      </div>

      {/* Allowlist Mode Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowlistMode}
            onChange={(e) => setAllowlistMode(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            disabled={allowlist.length === 0}
          />
          <span className="text-sm text-gray-700">
            Allowlist Mode (show only approved devices)
          </span>
        </label>
        {allowlist.length === 0 && (
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Add MAC addresses to enable allowlist mode
          </p>
        )}
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Approved MAC Addresses (one per line)
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={10}
            placeholder="00:11:22:33:44:55&#10;aa:bb:cc:dd:ee:ff"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveAllowlist}
              className="btn btn-primary btn-icon"
            >
              <Save className="icon-sm" />
              Save Allowlist
            </button>
            <button
              onClick={handleToggleEditor}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current Allowlist Summary */}
      {!showEditor && allowlist.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Approved MAC Addresses ({allowlist.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {allowlist.slice(0, 10).map((mac, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs font-mono bg-white text-gray-700 border border-gray-200 rounded"
              >
                {mac}
              </span>
            ))}
            {allowlist.length > 10 && (
              <span className="px-2 py-1 text-xs text-gray-500">
                +{allowlist.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
