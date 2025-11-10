import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
};

export default api;
