import api from './api';

const alertService = {
  getAlerts() {
    return api.get('/alerts');
  },
  getAlertSummary() {
    return api.get('/alerts/summary');
  },
  // Admin only. status: open | investigating | resolved
  updateAlertStatus(id, status) {
    return api.post(`/admin/alerts/${id}/status`, { status });
  },
};

export default alertService;
