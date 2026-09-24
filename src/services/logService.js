import api from './api';

const logService = {
  getLogStats() {
    return api.get('/logs/stats');
  },
  // Backend search is GET /logs/search?query=...
  searchLogs(query = '') {
    return api.get('/logs/search', { params: { query } });
  },
  getLogById(id) {
    return api.get(`/logs/${id}`);
  },
  uploadLog(rawLog, sourceType) {
    const body = { rawLog };
    if (sourceType) body.sourceType = sourceType;
    return api.post('/logs/upload', body);
  },
  unlockLog(id, secondaryPassword) {
    return api.post(`/logs/${id}/unlock`, { secondaryPassword });
  },
  requestSensitiveAccess() {
    return api.post('/access-requests');
  },
};

export default logService;
