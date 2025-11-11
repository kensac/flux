import { useState } from 'react';
import { Bot, Play, Pause, Settings, CheckCircle, Clock, Users, Thermometer, Lightbulb, Shield } from 'lucide-react';

export default function SmartAutomation({ stats }) {
  const [automations, setAutomations] = useState([
    {
      id: 'hvac-auto',
      name: 'Adaptive HVAC Control',
      description: 'Automatically adjusts temperature based on real-time occupancy',
      icon: Thermometer,
      enabled: true,
      savings: '35%',
      status: 'Active',
      rules: [
        { condition: 'Occupancy < 5 people', action: 'Set temp to 72°F (energy saving)' },
        { condition: 'Occupancy 5-20 people', action: 'Set temp to 70°F (comfort mode)' },
        { condition: 'Occupancy > 20 people', action: 'Set temp to 68°F (full cooling)' },
        { condition: 'After hours (no occupancy)', action: 'Set temp to 78°F (minimal cooling)' }
      ],
      metrics: {
        activations: 127,
        energySaved: '450 kWh',
        costSaved: '$54'
      }
    },
    {
      id: 'lighting-auto',
      name: 'Intelligent Lighting',
      description: 'Dims or turns off lights in unoccupied zones',
      icon: Lightbulb,
      enabled: true,
      savings: '40%',
      status: 'Active',
      rules: [
        { condition: 'No occupancy detected', action: 'Turn off lights after 5 min' },
        { condition: 'Low occupancy (< 3 people)', action: 'Reduce to 60% brightness' },
        { condition: 'Normal occupancy', action: '100% brightness' },
        { condition: 'After business hours', action: 'Emergency lighting only' }
      ],
      metrics: {
        activations: 89,
        energySaved: '280 kWh',
        costSaved: '$34'
      }
    },
    {
      id: 'security-auto',
      name: 'Smart Security System',
      description: 'Adaptive security modes based on occupancy patterns',
      icon: Shield,
      enabled: true,
      savings: 'N/A',
      status: 'Active',
      rules: [
        { condition: 'After hours + occupancy detected', action: 'Send security alert' },
        { condition: 'Unexpected crowd (> 50 people)', action: 'Notify facilities team' },
        { condition: 'No activity for 30 min', action: 'Activate full security mode' },
        { condition: 'Normal business hours', action: 'Standard monitoring' }
      ],
      metrics: {
        activations: 12,
        alertsSent: '3',
        incidents: '0'
      }
    },
    {
      id: 'cleaning-auto',
      name: 'Predictive Cleaning Schedule',
      description: 'Optimizes janitorial services based on actual usage',
      icon: Bot,
      enabled: false,
      savings: '25%',
      status: 'Ready to activate',
      rules: [
        { condition: 'High traffic day (> 30 people)', action: 'Schedule deep clean' },
        { condition: 'Low traffic day (< 10 people)', action: 'Standard clean only' },
        { condition: 'Weekend with activity', action: 'Weekend crew deployment' },
        { condition: 'No activity detected', action: 'Skip cleaning (cost save)' }
      ],
      metrics: {
        activations: 0,
        costSaved: '$0',
        potential: '$1,200/mo'
      }
    }
  ]);

  const toggleAutomation = (id) => {
    setAutomations(automations.map(auto =>
      auto.id === id ? { ...auto, enabled: !auto.enabled, status: !auto.enabled ? 'Active' : 'Paused' } : auto
    ));
  };

  const currentOccupancy = stats?.devices?.active || 0;

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="card bg-white border-primary-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary-900 mb-1 flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Smart Building Automation
            </h2>
            <p className="text-sm text-primary-700">AI-powered occupancy-based facility controls</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-primary-600">Current Occupancy</p>
            <p className="text-3xl font-bold text-primary-900">{currentOccupancy}</p>
            <p className="text-xs text-primary-600">people detected</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4  border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Active Automations</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {automations.filter(a => a.enabled).length}
              <span className="text-lg text-gray-500">/{automations.length}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <span className="text-xs font-semibold text-gray-600">Total Activations</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {automations.reduce((sum, a) => sum + (a.metrics.activations || 0), 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Energy Saved</span>
            </div>
            <p className="text-3xl font-bold text-success-900">730</p>
            <p className="text-xs text-gray-500 mt-1">kWh this month</p>
          </div>

          <div className="bg-white rounded-lg p-4  border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success-600" />
              <span className="text-xs font-semibold text-gray-600">Cost Savings</span>
            </div>
            <p className="text-3xl font-bold text-success-900">$88</p>
            <p className="text-xs text-gray-500 mt-1">Month to date</p>
          </div>
        </div>
      </div>

      {/* Automation Cards */}
      <div className="grid grid-cols-1 gap-6">
        {automations.map((automation) => {
          const Icon = automation.icon;
          return (
            <div key={automation.id} className={`card transition-all ${automation.enabled ? 'border-l-4 border-l-primary-500' : 'border-l-4 border-l-gray-300'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 bg-white border ${automation.enabled ? 'border-primary-200' : 'border-gray-200'}`}>
                    <Icon className={`w-6 h-6 ${automation.enabled ? 'text-primary-600' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{automation.name}</h3>
                      <span className={`px-2.5 py-1 text-xs font-semibold border ${
                        automation.enabled
                          ? 'bg-white text-primary-700 border-primary-200'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}>
                        {automation.status}
                      </span>
                      {automation.savings !== 'N/A' && (
                        <span className="px-2.5 py-1 text-xs font-semibold bg-white text-gray-700 border border-gray-300">
                          {automation.savings} savings
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{automation.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAutomation(automation.id)}
                  className={`btn ${automation.enabled ? 'btn-secondary' : 'btn-primary'} btn-icon`}
                >
                  {automation.enabled ? (
                    <>
                      <Pause className="icon-sm" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="icon-sm" />
                      Activate
                    </>
                  )}
                </button>
              </div>

              {/* Automation Rules */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Automation Rules
                </h4>
                <div className="space-y-2">
                  {automation.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 bg-white border border-gray-300 rounded flex items-center justify-center text-xs font-semibold text-gray-700">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 mb-1">IF: {rule.condition}</p>
                        <p className="text-xs text-gray-700">THEN: {rule.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                {Object.entries(automation.metrics).map(([key, value]) => (
                  <div key={key} className="flex-1">
                    <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Benefits Summary */}
      <div className="card bg-white">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Why Smart Automation Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white border border-gray-200">
                <CheckCircle className="w-4 h-4 text-gray-700" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Cost Reduction</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Reduce operational costs by 25-40% through intelligent resource allocation based on actual occupancy, not schedules.
            </p>
          </div>

          <div className="p-4 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white border border-gray-200">
                <Bot className="w-4 h-4 text-gray-700" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Zero Manual Intervention</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Set it and forget it. System learns patterns and adapts automatically without staff intervention or complex programming.
            </p>
          </div>

          <div className="p-4 bg-white border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white border border-gray-200">
                <Users className="w-4 h-4 text-gray-700" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Enhanced Experience</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Maintain optimal comfort levels while minimizing waste. Occupants enjoy perfect conditions without energy waste.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
