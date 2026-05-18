import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('neuroflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message = err.response?.data?.error || 'Something went wrong';
    if (err.response?.status === 401) {
      localStorage.removeItem('neuroflow_token');
      window.location.href = '/login';
    } else if (err.response?.status !== 404) {
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  signUp: (data) => api.post('/auth/signup', data),
  signIn: (data) => api.post('/auth/signin', data),
  signOut: () => api.post('/auth/signout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data)
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getActivity: (id) => api.get(`/projects/${id}/activity`)
};

export const tasksAPI = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  get: (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
  delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  getDependencies: (projectId) => api.get(`/projects/${projectId}/tasks/dependencies`),
  addDependency: (projectId, taskId, data) => api.post(`/projects/${projectId}/tasks/${taskId}/dependencies`, data),
  removeDependency: (projectId, taskId, depId) => api.delete(`/projects/${projectId}/tasks/${taskId}/dependencies/${depId}`),
  logTime: (projectId, taskId, data) => api.post(`/projects/${projectId}/tasks/${taskId}/time`, data)
};

export const membersAPI = {
  getAll: (projectId) => api.get(`/projects/${projectId}/members`),
  add: (projectId, data) => api.post(`/projects/${projectId}/members`, data),
  update: (projectId, memberId, data) => api.patch(`/projects/${projectId}/members/${memberId}`, data),
  remove: (projectId, memberId) => api.delete(`/projects/${projectId}/members/${memberId}`),
  search: (projectId, q) => api.get(`/projects/${projectId}/members/search/users`, { params: { q } })
};

export const intelligenceAPI = {
  get: (projectId) => api.get(`/projects/${projectId}/intelligence`),
  ask: (projectId, question, useGrok = false) => api.post(`/projects/${projectId}/intelligence/ask`, { question, useGrok }),
};

export const adminAPI = {
  getUsers: (search) => api.get('/admin/users', { params: search ? { search } : {} }),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getTeamStats: (days) => api.get('/admin/team-stats', { params: { days } }),
  getOverviewReport: () => api.get('/admin/reports/overview'),
  getProjectReport: (projectId) => api.get(`/admin/reports/project/${projectId}`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getProject: (projectId) => api.get(`/analytics/projects/${projectId}`),
  getProductivity: (days) => api.get('/analytics/productivity', { params: { days } })
};

export default api;
