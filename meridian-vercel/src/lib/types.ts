export type Role = 'admin' | 'doctor' | 'pharmacist' | 'supplier' | 'patient';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  profileId: string | null;
  displayName: string;
  profile: Record<string, any> | null;
}

export interface Person { _id: string; firstName: string; lastName: string; fullName?: string }
export interface Patient extends Person {
  user?: { _id: string; email?: string; isActive?: boolean };
  dateOfBirth: string; gender: string; bloodGroup?: string; phone?: string; address?: string;
  emergencyContact?: string; emergencyPhone?: string; allergies?: string; age?: number; lastVisit?: string; visits?: number;
}
export interface Doctor extends Person {
  user?: { _id: string; email?: string; isActive?: boolean };
  specialization: string; licenseNumber: string; phone?: string; experienceYears?: number;
  availableDays: string[]; consultationFee: number; room?: string; bio?: string; appointmentsToday?: number;
}
export type StockStatus = 'Normal' | 'Low' | 'Critical' | 'Expired';
export interface Medicine {
  _id: string; name: string; genericName?: string; sku: string; category: string; manufacturer?: string;
  unitPrice: number; unit: string; stockQuantity: number; reorderLevel: number; batchNumber?: string;
  expiryDate?: string; dosageForm?: string; strength?: string; requiresPrescription: boolean; description?: string;
  stockStatus: StockStatus; daysUntilExpiry?: number | null; stockValue?: number; soldLast30Days?: number;
}
export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show';
export interface Appointment {
  _id: string; patient: Patient; doctor: Doctor; appointmentDate: string; appointmentTime: string;
  status: AppointmentStatus; reason?: string; notes?: string;
}
export interface PrescriptionItem {
  _id?: string; medicine: Medicine; quantity: number; dosage?: string; frequency?: string; durationDays?: number; instructions?: string;
}
export interface Prescription {
  _id: string; appointment: string; patient: Patient; doctor: Doctor; diagnosis: string; notes?: string;
  issuedDate: string; validUntil?: string; status: 'Active' | 'Fulfilled' | 'Expired' | 'Cancelled'; items: PrescriptionItem[];
}
export interface Sale {
  _id: string; pharmacist: Person; patient?: Person; prescription?: string; department: string;
  items: { medicine: Medicine; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number; paymentMethod: string; saleDate: string; notes?: string;
}
export interface MedicineRequest {
  _id: string; requestedBy: { _id: string; username: string; role: Role }; requestType: 'Internal' | 'External';
  medicine?: Medicine; medicineName?: string; quantityRequested: number; priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  reason?: string; status: 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled'; supplier?: { _id: string; companyName: string };
  respondedBy?: { username: string; role: Role }; responseNotes?: string; createdAt: string;
}
export interface SupplyOrder {
  _id: string; supplier: { _id: string; companyName: string; contactPerson?: string }; medicine: Medicine;
  request?: { _id: string; priority?: string }; quantity: number; unitCost?: number; totalCost?: number; batchNumber?: string;
  expiryDate?: string; suppliedDate: string; status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
  receivedBy?: { username: string }; notes?: string;
}
export interface Supplier {
  _id: string; companyName: string; contactPerson?: string; phone?: string; email?: string; address?: string; rating: number;
  licenseNumber?: string; user?: { isActive: boolean; email: string };
  performance?: { totalOrders: number; totalUnitsSupplied: number; totalValueSupplied: number; deliveredOrders: number; deliveryRatePct: number | null; lastSupplyDate?: string };
}
export interface AppNotification {
  _id: string; title: string; message: string; type: 'Info' | 'Warning' | 'Alert' | 'Success' | 'Appointment' | 'Stock';
  link?: string; isRead: boolean; createdAt: string;
}
export interface StockMovement {
  _id: string; medicine: Medicine; changedBy?: { username: string; role: Role }; changeType: 'Add' | 'Remove' | 'Sale' | 'Supply' | 'Adjust';
  quantityBefore: number; quantityChange: number; quantityAfter: number; reason?: string; changedAt: string;
}
export interface DashboardStats {
  totalActivePatients: number; totalActiveDoctors: number; totalPharmacists: number; totalSuppliers: number;
  totalMedicines: number; stockUnits: number; stockValue: number; lowStockCount: number; expiredCount: number;
  todayAppointments: number; completedToday: number; todayRevenue: number; monthRevenue: number;
  monthUnitsDispensed: number; pendingRequests: number;
}
export interface ApiList<T> { success: boolean; data: T; pagination?: { page: number; limit: number; total: number; pages: number } }
