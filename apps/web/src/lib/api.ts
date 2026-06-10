import axios from 'axios';
import { log } from '@bluemetal/shared';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => { log.debug("API " + (r.config.method || '').toUpperCase() + " " + r.config.url + " -> " + r.status); return r; },
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    log.error("API " + (err.config?.method || '').toUpperCase() + " " + (err.config?.url || '') + " failed", { status: err.response?.status });
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

// Sales
export const getSales = (params?: any) => api.get('/sales', { params }).then(r => r.data);
export const createSale = (data: any) => api.post('/sales', data).then(r => r.data);
export const getSale = (id: string) => api.get(`/sales/${id}`).then(r => r.data);
export const cancelSale = (id: string) => api.patch(`/sales/${id}/cancel`).then(r => r.data);
export const getTodaySummary = () => api.get('/sales/summary/today').then(r => r.data);

// Parties
export const getParties = (params?: any) => api.get('/parties', { params }).then(r => r.data);
export const createParty = (data: any) => api.post('/parties', data).then(r => r.data);

// Products
export const getProducts = () => api.get('/products').then(r => r.data);

// Vehicles
export const getVehicles = () => api.get('/vehicles').then(r => r.data);
export const createVehicle = (data: any) => api.post('/vehicles', data).then(r => r.data);

// Reports
export const getItemWiseReport = (params: any) => api.get('/reports/item-wise', { params }).then(r => r.data);
export const getPartyWiseReport = (params: any) => api.get('/reports/party-wise', { params }).then(r => r.data);
export const getGstSummary = (params: any) => api.get('/reports/gst-summary', { params }).then(r => r.data);
export const getMonthlyTrend = () => api.get('/reports/monthly-trend').then(r => r.data);
export const getDashboard = () => api.get('/reports/dashboard').then(r => r.data);

// Invoices
export const downloadInvoice = (saleId: string) =>
  api.get(`/invoices/${saleId}/pdf`, { responseType: 'blob' }).then(r => r.data);

// Purchases
export const getPurchases = (params?: any) => api.get('/purchases', { params }).then(r => r.data);
export const getPurchase = (id: string) => api.get(`/purchases/${id}`).then(r => r.data);
export const createPurchase = (data: any) => api.post('/purchases', data).then(r => r.data);
export const updatePurchase = (id: string, data: any) => api.put(`/purchases/${id}`, data).then(r => r.data);

// Ledger
export const getLedgerBalances = () => api.get('/ledger/balances').then(r => r.data);
export const getPartyLedger = (partyId: string, params?: any) =>
  api.get(`/ledger/party/${partyId}`, { params }).then(r => r.data);
export const createReceipt = (data: any) => api.post('/ledger/receipt', data).then(r => r.data);

// Quarry
export const getQuarrySales = (params?: any) => api.get('/quarry', { params }).then(r => r.data);
export const createQuarrySale = (data: any) => api.post('/quarry', data).then(r => r.data);

// Users
export const getUsers = () => api.get('/users').then(r => r.data);
export const createUser = (data: any) => api.post('/users', data).then(r => r.data);
export const updateUser = (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data);

// Maintenance
export const getMaintenanceRecords = (params?: any) => api.get('/maintenance/records', { params }).then(r => r.data);
export const getUpcomingMaintenance = () => api.get('/maintenance/upcoming').then(r => r.data);
export const getAssets = (params?: any) => api.get('/maintenance/assets', { params }).then(r => r.data);

// Wages
export const getWorkers = () => api.get('/wages/workers').then(r => r.data);
export const getAttendance = (params: any) => api.get('/wages/attendance', { params }).then(r => r.data);
export const submitAttendance = (data: any) => api.post('/wages/attendance/bulk', data).then(r => r.data);

// Config
export const getConfig = () => api.get('/config').then(r => r.data);
export const updateConfig = (data: any) => api.put('/config', data).then(r => r.data);

// Notifications
export const getNotifications = () => api.get('/notifications').then(r => r.data);

// Crusher selection & management
export const selectCrusher = (crusher_id: string) =>
  api.post('/auth/select-crusher', { crusher_id }).then(r => r.data);

export const getCrushers = () => api.get('/crushers').then(r => r.data);
export const createCrusher = (data: any) => api.post('/crushers', data).then(r => r.data);
export const updateCrusher = (id: string, data: any) => api.put(`/crushers/${id}`, data).then(r => r.data);
export const getCrusherUsers = (id: string) => api.get(`/crushers/${id}/users`).then(r => r.data);
export const grantCrusherAccess = (id: string, data: any) => api.post(`/crushers/${id}/users`, data).then(r => r.data);
export const revokeCrusherAccess = (id: string, userId: string) => api.delete(`/crushers/${id}/users/${userId}`).then(r => r.data);

// Reports
export const getPlReport = (params: { from: string; to: string }) =>
  api.get('/reports/pl', { params }).then(r => r.data);

// Platform admin
export const getPlatformOverview = () => api.get('/platform/overview').then(r => r.data);
export const getPlatformUsers = () => api.get('/platform/users').then(r => r.data);
export const platformCreateCrusher = (data: any) => api.post('/platform/crushers', data).then(r => r.data);
export const getPlatformCrusherUsers = (id: string) => api.get(`/platform/crushers/${id}/users`).then(r => r.data);
export const platformAddUserToCrusher = (id: string, data: any) => api.post(`/platform/crushers/${id}/users`, data).then(r => r.data);
export const platformRemoveUserFromCrusher = (crusherId: string, userId: string) => api.delete(`/platform/crushers/${crusherId}/users/${userId}`).then(r => r.data);
export const platformSetCrusherStatus = (id: string, is_active: boolean) => api.patch(`/platform/crushers/${id}/status`, { is_active }).then(r => r.data);
export const platformCreateUser = (data: any) => api.post('/platform/users', data).then(r => r.data);

// Profile / notification prefs
export const getMyProfile = () => api.get('/users/me').then(r => r.data);
export const updateMyNotifyPrefs = (notify_events: string[]) => api.patch('/users/me', { notify_events }).then(r => r.data);

// Full notification list
export const getNotifications = (limit = 50) => api.get(`/notifications?limit=${limit}`).then(r => r.data);
export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`).then(r => r.data);
export const markAllNotificationsRead = () => api.post('/notifications/mark-all-read').then(r => r.data);
