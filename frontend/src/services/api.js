import axios from 'axios';

// Use VITE_API_URL env var, fallback to relative /api path
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Stats
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },

  // Devices
  getDevices: async (limit = 100) => {
    const response = await api.get('/devices', { params: { limit } });
    return response.data;
  },

  getActiveDevices: async (minutes = 5) => {
    const response = await api.get('/devices/active', { params: { minutes } });
    return response.data;
  },

  // Access Points
  getAccessPoints: async (limit = 100) => {
    const response = await api.get('/access-points', { params: { limit } });
    return response.data;
  },

  getActiveAccessPoints: async (minutes = 5) => {
    const response = await api.get('/access-points/active', { params: { minutes } });
    return response.data;
  },

  // Channel Hopping Config
  getChannelConfig: async () => {
    const response = await api.get('/config/channel-hopping');
    return response.data;
  },

  updateChannelConfig: async (config) => {
    const response = await api.put('/config/channel-hopping', config);
    return response.data;
  },

  // Metrics
  getMetricsHistory: async (params = {}) => {
    const { tier = '1h', start, end, limit = 100 } = params;
    const response = await api.get('/metrics/history', {
      params: { tier, start, end, limit },
    });
    return response.data;
  },

  getMetricsSummary: async (params = {}) => {
    const { tier = '1h', start, end } = params;
    const response = await api.get('/metrics/summary', {
      params: { tier, start, end },
    });
    return response.data;
  },

  // Operations Config
  getOperationsConfig: async () => {
    // Load from localStorage like operations.html does
    const stored = localStorage.getItem('flux_ops_config');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Return defaults if nothing in localStorage
    return {
      hvac: {
        buildingCapacity: 200,
        baselineDevices: 15,
        minOccupancyForFull: 40,
        fullCostPerHour: 35,
        reducedCostPerHour: 12
      },
      lighting: {
        minOccupancy: 5,
        fullCostPerHour: 8,
        dimmedCostPerHour: 2
      },
      janitorial: {
        dailyCleaningCost: 150,
        lowUsageThreshold: 20,
        highUsageThreshold: 150
      },
      security: {
        afterHoursStart: '22:00',
        afterHoursEnd: '06:00',
        alertThreshold: 10
      }
    };
  },

  updateOperationsConfig: async (config) => {
    // Save to localStorage like operations.html does
    const stored = localStorage.getItem('flux_ops_config');
    const fullConfig = stored ? JSON.parse(stored) : {};

    // Merge the new config with existing
    const updated = { ...fullConfig, ...config };
    localStorage.setItem('flux_ops_config', JSON.stringify(updated));

    return updated;
  },

  // Data Platform - Advanced Query Methods
  queryDevices: async (queryParams = {}) => {
    const { filters = [], timeRange = '1h', sortBy = 'last_seen', sortOrder = 'desc', limit = 100 } = queryParams;

    // For now, use existing endpoints and apply client-side filtering
    // In a real implementation, these filters would be sent to the backend
    const timeRangeMap = {
      '5m': 5, '15m': 15, '1h': 60, '6h': 360, '24h': 1440,
      '7d': 10080, '30d': 43200, 'all': undefined
    };

    const minutes = timeRangeMap[timeRange];
    const devices = minutes
      ? await apiService.getActiveDevices(minutes)
      : await apiService.getDevices(limit);

    return devices;
  },

  queryAccessPoints: async (queryParams = {}) => {
    const { limit = 100 } = queryParams;
    const aps = await apiService.getAccessPoints(limit);
    return aps;
  },

  // Device Segmentation
  getDeviceSegments: async (segmentType = 'vendor') => {
    // This would ideally be a backend endpoint
    // For now, we fetch all devices and segment client-side
    const devices = await apiService.getDevices(500);
    return { devices, segmentType };
  },

  // Export data
  exportData: async (dataType = 'all') => {
    const [stats, devices, aps, metrics] = await Promise.all([
      apiService.getStats(),
      apiService.getDevices(1000),
      apiService.getAccessPoints(500),
      apiService.getMetricsHistory({ tier: '1h', limit: 168 })
    ]);

    return {
      stats,
      devices,
      accessPoints: aps,
      metrics,
      exportedAt: new Date().toISOString()
    };
  },
};

export default api;
