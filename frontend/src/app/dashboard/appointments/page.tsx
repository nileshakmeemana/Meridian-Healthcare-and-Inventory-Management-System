'use client';
// src/app/dashboard/appointments/page.tsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, CheckCircle, XCircle, User, Stethoscope, Search, X, MapPin } from 'lucide-react';
import { appointmentAPI, doctorAPI } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const statusIcon: Record<string, React.ReactNode> = {
  Scheduled: <Clock className="w-4 h-4 text-blue-500" />,
  Completed: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  Cancelled: <XCircle className="w-4 h-4 text-rose-500" />,
  'No-Show': <XCircle className="w-4 h-4 text-gray-400" />,
};
const statusBadge: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-rose-100 text-rose-700',
  'No-Show': 'bg-gray-100 text-gray-600',
};

export default function AppointmentsPage() {
  const user  = useAuthStore((s) => s.user);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [filter,  setFilter]            = useState('all');
  const [showBook, setShowBook]         = useState(false);
  const [actioningId, setActioningId]   = useState<number | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await appointmentAPI.getAll();
        setAppointments(res.data.data || []);
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!showBook) return;

    const loadDoctors = async () => {
      try {
        const res = await doctorAPI.getAll();
        const rows = res.data?.data || [];
        setDoctors(rows.filter((d: any) => d.IS_ACTIVE !== 0 && d.IS_ACTIVE !== '0'));
      } catch {
        setDoctors([]);
      }
    };

    loadDoctors();
    setBookingError('');
    setBookingSuccess('');
    setSelectedDoctorId('');
    setDoctorSearch('');
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
    setAvailability([]);
  }, [showBook]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDoctorId || !selectedDate) {
        setAvailability([]);
        setSelectedTime('');
        return;
      }
      try {
        const res = await appointmentAPI.getAvailability({
          doctor_id: selectedDoctorId,
          date: selectedDate,
        });
        setAvailability(res.data?.data || []);
        setSelectedTime(prev => (res.data?.data?.includes(prev) ? prev : ''));
      } catch {
        setAvailability([]);
      }
    };

    loadAvailability();
  }, [selectedDoctorId, selectedDate]);

  const reloadAppointments = async () => {
    try {
      const res = await appointmentAPI.getAll();
      setAppointments(res.data.data || []);
    } catch {
      setAppointments([]);
    }
  };

  const completeAppointment = async (appointmentId: number) => {
    setActioningId(appointmentId);
    try {
      await appointmentAPI.updateStatus(appointmentId, { status: 'Completed' });
      await reloadAppointments();
    } catch {
    } finally {
      setActioningId(null);
    }
  };

  const cancelAppointment = async (appointmentId: number) => {
    setActioningId(appointmentId);
    try {
      await appointmentAPI.cancel(appointmentId);
      await reloadAppointments();
    } catch {
    } finally {
      setActioningId(null);
    }
  };

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.STATUS === filter);

  const counts = {
    all:       appointments.length,
    Scheduled: appointments.filter(a => a.STATUS === 'Scheduled').length,
    Completed: appointments.filter(a => a.STATUS === 'Completed').length,
    Cancelled: appointments.filter(a => a.STATUS === 'Cancelled').length,
  };

  const submitBooking = async () => {
    if (!selectedDoctorId) {
      setBookingError('Please select a doctor.');
      return;
    }
    if (!selectedDate) {
      setBookingError('Please choose an appointment date.');
      return;
    }
    if (!selectedTime) {
      setBookingError('Please select an available time slot.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');
    try {
      await appointmentAPI.book({
        doctor_id: Number(selectedDoctorId),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason,
      });
      await reloadAppointments();
      setBookingSuccess('Appointment booked successfully.');
      setShowBook(false);
    } catch (err: any) {
      setBookingError(err?.response?.data?.message || err?.message || 'Unable to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedDoctor = doctors.find(d => String(d.DOCTOR_ID) === String(selectedDoctorId));
  const visibleDoctors = doctors.filter((doctor: any) => {
    const name = String(doctor.FULL_NAME || doctor.full_name || '').toLowerCase();
    const specialization = String(doctor.SPECIALIZATION || doctor.specialization || '').toLowerCase();
    const term = doctorSearch.toLowerCase();
    return name.includes(term) || specialization.includes(term);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground text-sm">Manage and track patient appointments</p>
        </div>
        {user?.role === 'patient' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBook(true)}
            className="flex items-center gap-2 bg-meridian-500 hover:bg-meridian-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Book Appointment
          </motion.button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all',       label: 'All' },
          { key: 'Scheduled', label: 'Scheduled' },
          { key: 'Completed', label: 'Completed' },
          { key: 'Cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-meridian-500 text-white'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({counts[tab.key as keyof typeof counts] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Appointment cards */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          ))
        ) : filtered.map((appt) => (
          <motion.div
            key={appt.APPOINTMENT_ID}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-5 flex items-start gap-4 hover:border-meridian-300 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-meridian-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-meridian-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{appt.PATIENT_NAME}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Stethoscope className="w-3 h-3" />
                    {appt.DOCTOR_NAME} · {appt.SPECIALIZATION}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 flex-shrink-0 ${statusBadge[appt.STATUS]}`}>
                  {statusIcon[appt.STATUS]}
                  {appt.STATUS}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(appt.APPOINTMENT_DATE).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {appt.APPOINTMENT_TIME}
                </div>
                {appt.REASON && (
                  <p className="text-muted-foreground truncate">· {appt.REASON}</p>
                )}
              </div>
            </div>

            {appt.STATUS === 'Scheduled' && user?.role === 'doctor' && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => completeAppointment(appt.APPOINTMENT_ID)}
                  disabled={actioningId === appt.APPOINTMENT_ID}
                  className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actioningId === appt.APPOINTMENT_ID ? 'Saving...' : 'Complete'}
                </button>
                <button
                  onClick={() => cancelAppointment(appt.APPOINTMENT_ID)}
                  disabled={actioningId === appt.APPOINTMENT_ID}
                  className="text-xs border border-border px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {bookingSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {bookingSuccess}
        </div>
      )}

      {/* Booking Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBook(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Book Appointment</h2>
                <p className="text-sm text-gray-500">Select a doctor, date, and available time slot</p>
              </div>
              <button onClick={() => setShowBook(false)} className="p-2 rounded-xl hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-h-[calc(90vh-73px)]">
              <div className="lg:col-span-2 p-6 overflow-y-auto">
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search by doctor name or specialization"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {visibleDoctors.map((doctor: any) => {
                    const isSelected = String(doctor.DOCTOR_ID) === String(selectedDoctorId);
                    return (
                      <button
                        key={doctor.DOCTOR_ID}
                        onClick={() => setSelectedDoctorId(String(doctor.DOCTOR_ID))}
                        className={`text-left rounded-2xl border p-4 transition-all ${isSelected ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-gray-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">Dr. {doctor.FULL_NAME || doctor.full_name || 'Unknown Doctor'}</p>
                            <p className="text-sm text-teal-600 mt-0.5">{doctor.SPECIALIZATION || doctor.specialization || 'General Medicine'}</p>
                          </div>
                          <span className="text-xs rounded-full bg-white px-2 py-1 text-gray-500 border border-gray-200">
                            #{doctor.DOCTOR_ID}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5" />
                          {doctor.PHONE || doctor.phone || 'No phone available'}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Consultation fee: LKR {Number(doctor.CONSULTATION_FEE || doctor.consultation_fee || 0).toFixed(2)}
                        </div>
                        <div className="mt-2 text-xs font-medium text-emerald-600">
                          Available for booking
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t lg:border-t-0 lg:border-l border-gray-100 p-6 bg-gray-50/70 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Selected Doctor</label>
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      {selectedDoctor ? `Dr. ${selectedDoctor.FULL_NAME || selectedDoctor.full_name}` : 'Choose a doctor from the list'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Appointment Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Available Time Slots</label>
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const available = availability.length === 0 || availability.includes(slot);
                        const selected = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            disabled={!available}
                            onClick={() => setSelectedTime(slot)}
                            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${selected ? 'border-teal-500 bg-teal-600 text-white' : available ? 'border-gray-200 bg-white text-gray-700 hover:border-teal-300' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason</label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe the reason for your visit"
                      rows={4}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                    />
                  </div>

                  {bookingError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {bookingError}
                    </div>
                  )}

                  <button
                    onClick={submitBooking}
                    disabled={bookingLoading || !selectedDoctorId || !selectedDate || !selectedTime}
                    className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {bookingLoading ? 'Booking...' : 'Confirm Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
