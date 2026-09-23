import api, { USE_MOCK } from './api';
import { adminMock } from '../mock/adminMock';

const adminService = {
  async getUsers() {
    if (USE_MOCK) {
      return adminMock.getUsers();
    }
    return api.get('/admin/users');
  },

  async updateUserRole(userId, role) {
    if (USE_MOCK) {
      return adminMock.updateUserRole(userId, role);
    }
    return api.patch(`/admin/users/${userId}/role`, { role });
  },

  async getSystemStats() {
    if (USE_MOCK) {
      return adminMock.getSystemStats();
    }
    return api.get('/admin/stats');
  },
};

export default adminService;
