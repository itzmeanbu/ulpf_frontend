import api, { USE_MOCK } from './api';
import { logMock } from '../mock/logMock';

const logService = {
  async getLogs(filters = {}) {
    if (USE_MOCK) {
      return logMock.getLogs(filters);
    }
    return api.get('/logs', { params: filters });
  },

  async getLogById(id) {
    if (USE_MOCK) {
      return logMock.getLogById(id);
    }
    return api.get(`/logs/${id}`);
  },

  async getLogStats() {
    if (USE_MOCK) {
      return logMock.getLogStats();
    }
    return api.get('/logs/stats');
  },
};

export default logService;
