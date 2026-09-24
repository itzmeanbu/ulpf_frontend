import api from './api';

const adminService = {
  getOverview: () => api.get('/admin/overview'),

  getUsers: () => api.get('/admin/users'),
  updateUserRole: (id, role) => api.post(`/admin/users/${id}/role`, { role }),
  disableUser: (id) => api.post(`/admin/users/${id}/disable`),
  enableUser: (id) => api.post(`/admin/users/${id}/enable`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  revokeSensitive: (id) => api.post(`/admin/users/${id}/revoke-sensitive`),

  getAccessRequests: () => api.get('/access-requests'),
  approveAccessRequest: (id) => api.post(`/access-requests/${id}/approve`),
  rejectAccessRequest: (id) => api.post(`/access-requests/${id}/reject`),

  getSources: () => api.get('/admin/sources'),
  addSource: (name, vendor) => api.post('/admin/sources', { name, vendor }),
  updateSource: (id, data) => api.patch(`/admin/sources/${id}`, data),

  getLogAccess: () => api.get('/admin/log-access'),
  setLogAccess: (userId, categories) => api.post(`/admin/log-access/${userId}`, { categories }),

  getAudit: () => api.get('/admin/audit'),
  getReport: (type) => api.get(`/admin/reports/${type}`),
  getSecurityStatus: () => api.get('/admin/security-status'),

  getMasking: () => api.get('/admin/masking-config'),
  saveMasking: (cfg) => api.post('/admin/masking-config', cfg),
  getAiSettings: () => api.get('/admin/ai-settings'),
  saveAiSettings: (cfg) => api.post('/admin/ai-settings', cfg),
  getSystemSettings: () => api.get('/admin/system-settings'),
  saveSystemSettings: (cfg) => api.post('/admin/system-settings', cfg),
  setSecondaryPassword: (newPassword) => api.post('/admin/secondary-password', { newPassword }),
};

export default adminService;
