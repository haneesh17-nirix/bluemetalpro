import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://YOUR_API_URL/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(r => r, async (err) => {
  if (err.response?.status === 401) {
    await SecureStore.deleteItemAsync('token');
    // Navigation handled in app
  }
  return Promise.reject(err);
});

export default api;

export const login = (email: string, password: string, fcm_token?: string) =>
  api.post('/auth/login', { email, password, fcm_token }).then(r => r.data);

export const getSales = (params?: any) => api.get('/sales', { params }).then(r => r.data);
export const createSale = (data: any) => api.post('/sales', data).then(r => r.data);
export const getParties = (params?: any) => api.get('/parties', { params }).then(r => r.data);
export const getProducts = () => api.get('/products').then(r => r.data);
export const getVehicles = () => api.get('/vehicles').then(r => r.data);
export const createVehicle = (data: any) => api.post('/vehicles', data).then(r => r.data);
export const getDashboard = () => api.get('/reports/dashboard').then(r => r.data);
export const getItemWiseReport = (p: any) => api.get('/reports/item-wise', { params: p }).then(r => r.data);
export const getQuarrySales = (p?: any) => api.get('/quarry', { params: p }).then(r => r.data);
export const createQuarrySale = (data: any) => api.post('/quarry', data).then(r => r.data);
export const getMaintenanceRecords = (p?: any) => api.get('/maintenance/records', { params: p }).then(r => r.data);
export const getUpcomingMaintenance = () => api.get('/maintenance/upcoming').then(r => r.data);
export const getWorkers = () => api.get('/wages/workers').then(r => r.data);
export const getAttendance = (p: any) => api.get('/wages/attendance', { params: p }).then(r => r.data);
export const submitAttendance = (data: any) => api.post('/wages/attendance/bulk', data).then(r => r.data);
export const getNotifications = () => api.get('/notifications').then(r => r.data);
export const markAllRead = () => api.post('/notifications/mark-all-read').then(r => r.data);
export const registerDevice = (fcm_token: string) => api.post('/notifications/register-device', { fcm_token }).then(r => r.data);
