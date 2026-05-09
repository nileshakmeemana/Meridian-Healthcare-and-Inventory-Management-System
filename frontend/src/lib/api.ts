// src/lib/api.ts
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('meridian_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('meridian_token');
      localStorage.removeItem('meridian_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data: { email: string; password: string }) => api.post('/auth/login', data),
  register:       (data: any) => api.post('/auth/register', data),
  getMe:          () => api.get('/auth/me'),
  me:             () => api.get('/auth/me'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// ── Medicines ─────────────────────────────────────────────────────────────────
export const medicineAPI = {
  getAll:       (params?: any) => api.get('/medicines', { params }),
  getById:      (id: number)   => api.get(`/medicines/${id}`),
  getLowStock:  ()             => api.get('/medicines/low-stock'),
  getCategories:()             => api.get('/medicines/categories'),
  create:       (data: any)    => api.post('/medicines', data),
  update:       (id: number, data: any) => api.put(`/medicines/${id}`, data),
  updateStock:  (id: number, data: any) => api.patch(`/medicines/${id}/stock`, data),
  getStockHistory: (id: number) => api.get(`/medicines/${id}/stock-history`),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentAPI = {
  getAll:        (params?: any) => api.get('/appointments', { params }),
  getToday:      ()             => api.get('/appointments/today'),
  getAvailability: (params: any)=> api.get('/appointments/availability', { params }),
  book:          (data: any)    => api.post('/appointments', data),
  updateStatus:  (id: number, data: any) => api.patch(`/appointments/${id}/status`, data),
  cancel:        (id: number)   => api.patch(`/appointments/${id}/cancel`),
};

// ── Reports / BI ──────────────────────────────────────────────────────────────
export const reportAPI = {
  dashboard:         ()             => api.get('/reports/dashboard'),
  mostUsedMedicines: (params?: any) => api.get('/reports/most-used-medicines', { params }),
  stockReport:       ()             => api.get('/reports/stock'),
  supplierPerformance:()            => api.get('/reports/suppliers'),
  appointmentStats:  ()             => api.get('/reports/appointments'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Users
  getUsers:         () => api.get('/admin/users'),
  createUser:       (data: any) => api.post('/admin/users', data),
  updateUser:       (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  toggleUserStatus: (id: number) => api.patch(`/admin/users/${id}/toggle`),
  deleteUser:       (id: number) => api.delete(`/admin/users/${id}`),
  // Doctors
  getDoctors:       (params?: any) => api.get('/admin/doctors', { params }),
  createDoctor:     (data: any) => api.post('/admin/doctors', data),
  updateDoctor:     (id: number, data: any) => api.put(`/admin/doctors/${id}`, data),
  toggleDoctorStatus: (id: number) => api.patch(`/admin/doctors/${id}/toggle`),
  deleteDoctor:     (id: number) => api.delete(`/admin/doctors/${id}`),
  // Pharmacists
  getPharmacists:   () => api.get('/admin/pharmacists'),
  createPharmacist: (data: any) => api.post('/admin/pharmacists', data),
  updatePharmacist: (id: number, data: any) => api.put(`/admin/pharmacists/${id}`, data),
  togglePharmacistStatus: (id: number) => api.patch(`/admin/pharmacists/${id}/toggle`),
  deletePharmacist: (id: number) => api.delete(`/admin/pharmacists/${id}`),
  // Patients (admin)
  getPatients:      (params?: any) => api.get('/admin/patients', { params }),
  createPatient:    (data: any) => api.post('/admin/patients', data),
  deletePatient:    (id: number) => api.delete(`/patients/${id}`),
};

// ── Patients ──────────────────────────────────────────────────────────────────
export const patientAPI = {
  getAll:          (params?: any) => api.get('/patients', { params }),
  getById:         (id: number) => api.get(`/patients/${id}`),
  getMe:           () => api.get('/patients/me'),
  updateMe:        (data: any) => api.put('/patients/me', data),
  getMedicalHistory: (id: number) => api.get(`/patients/${id}/history`),
  getMyPrescriptions: () => api.get('/patients/prescriptions'),
  delete:          (id: number) => api.delete(`/patients/${id}`),
};

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorAPI = {
  getAll:         (params?: any) => api.get('/doctors', { params }),
  getById:        (id: number) => api.get(`/doctors/${id}`),
  getSchedule:    () => api.get('/doctors/schedule'),
  updateProfile:  (data: any) => api.put('/doctors/profile', data),
  addDiagnosis:   (data: any) => api.post('/doctors/diagnosis', data),
};

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const prescriptionAPI = {
  getAll:   () => api.get('/prescriptions'),
  getById:  (id: number) => api.get(`/prescriptions/${id}`),
  create:   (data: any) => api.post('/prescriptions', data),
  update:   (id: number, data: any) => api.put(`/prescriptions/${id}`, data),
  complete: (id: number) => api.patch(`/prescriptions/${id}/complete`),
  delete:   (id: number) => api.delete(`/prescriptions/${id}`),
};

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const supplierAPI = {
  getAll:           () => api.get('/suppliers'),
  create:           (data: any) => api.post('/suppliers', data),
  update:           (id: number, data: any) => api.put(`/suppliers/${id}`, data),
  delete:           (id: number) => api.delete(`/suppliers/${id}`),
  getRequests:      () => api.get('/suppliers/requests'),
  updateRequest:    (id: number, status: string) => api.put(`/suppliers/requests/${id}`, { status }),
  createOrder:      (data: any) => api.post('/suppliers/supply-orders', data),
  createOrderAdmin: (data: any) => api.post('/suppliers/supply-orders/admin', data),
  getOrders:        (params?: any) => api.get('/suppliers/supply-orders', { params }),
  updateOrderStatus: (supplyId: number, status: string) => api.patch(`/suppliers/supply-orders/${supplyId}/status`, { status }),
  getHistory:       () => api.get('/suppliers/supply-history'),
  updateProfile:    (data: any) => api.put('/suppliers/profile', data),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:        () => api.get('/notifications'),
  getUnreadCount:() => api.get('/notifications/unread-count'),
  markRead:      (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead:   () => api.put('/notifications/read-all'),
};

export default api;
