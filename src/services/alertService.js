import api, { USE_MOCK } from './api';
import { alertMock } from '../mock/alertMock';

const alertService = {
  async getAlerts(filters = {}) {
    if (USE_MOCK) {
      return alertMock.getAlerts(filters);
    }
    return api.get('/alerts', { params: filters });
  },

  async getAlertSummary() {
    if (USE_MOCK) {
      return alertMock.getAlertSummary();
    }
    return api.get('/alerts/summary');
  },

  async acknowledgeAlert(id) {
    if (USE_MOCK) {
      return alertMock.acknowledgeAlert(id);
    }
    return api.patch(`/alerts/${id}/acknowledge`);
  },
};

export default alertService;
