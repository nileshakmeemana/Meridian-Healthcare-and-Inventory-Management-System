'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, FileText, Users, Pill, TrendingUp, Clock, MapPin, Phone, Mail, Award } from 'lucide-react'
import { doctorAPI, appointmentAPI, prescriptionAPI, reportAPI } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { cn, formatDate } from '@/lib/utils'

export default function DoctorDashboardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorProfile, setDoctorProfile] = useState<any>(null)
  const [appointments, setAppointments] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [todayAppointments, setTodayAppointments] = useState(0)

  useEffect(() => {
    loadDoctorData()
  }, [user])

  const loadDoctorData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Set doctor profile from auth store
      if (user?.userId) {
        setDoctorProfile({
          name: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.username || 'Dr. Unknown',
          specialization: user?.specialization || 'General Medicine',
          email: user?.email,
          phone: user?.phone,
        })
      }

      try {
        // Fetch dashboard stats from reports API
        const statsRes = await reportAPI.dashboard()
        console.log('Dashboard stats response:', statsRes.data)
        if (statsRes.data?.data) {
          setTodayAppointments(statsRes.data.data.todayAppointments || 0)
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
      }

      // Fetch doctor schedule (appointments) - for the upcoming appointments list
      try {
        const appointmentsRes = await appointmentAPI.getAll()
        console.log('Appointments response:', appointmentsRes.data)
        const appts = appointmentsRes.data?.data || appointmentsRes.data || []
        setAppointments(Array.isArray(appts) ? appts : [])
      } catch (err) {
        console.error('Error fetching appointments:', err)
        setAppointments([])
      }

      // Fetch prescriptions
      try {
        const prescriptionsRes = await prescriptionAPI.getAll()
        console.log('Prescriptions response:', prescriptionsRes.data)
        const prescs = prescriptionsRes.data?.data || prescriptionsRes.data || []
        setPrescriptions(Array.isArray(prescs) ? prescs : [])
      } catch (err) {
        console.error('Error fetching prescriptions:', err)
        setPrescriptions([])
      }
    } catch (err: any) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const upcomingAppointments = (Array.isArray(appointments) ? appointments : [])
    .filter((a: any) => {
      try {
        const aDate = new Date(a.APPOINTMENT_DATE || a.appointment_date)
        return aDate >= new Date()
      } catch {
        return false
      }
    })
    .slice(0, 5)

  const recentPrescriptions = (Array.isArray(prescriptions) ? prescriptions : []).slice(0, 5)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-800 font-medium">Error loading dashboard</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <button
            onClick={loadDoctorData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Profile */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl border border-teal-100 p-8"
      >
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            {doctorProfile?.name?.substring(0, 2).toUpperCase() || 'DR'}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Dr. {doctorProfile?.name || 'Loading...'}</h1>
            <p className="text-teal-600 font-medium mt-1">{doctorProfile?.specialization}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              {doctorProfile?.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {doctorProfile.email}
                </div>
              )}
              {doctorProfile?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {doctorProfile.phone}
                </div>
              )}
            </div>
          </div>
          <Award className="w-12 h-12 text-teal-600 opacity-20" />
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today's Appointments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{todayAppointments || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-teal-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Appointments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{appointments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-purple-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prescriptions Issued</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{prescriptions.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-emerald-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{new Set(appointments.map((a: any) => a.PATIENT_ID || a.patient_id)).size}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Appointments</h2>
          <div className="space-y-3">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((apt: any, idx: number) => (
                <div
                  key={apt.APPOINTMENT_ID || idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{apt.PATIENT_NAME || 'Patient'}</p>
                      <p className="text-xs text-gray-500">{formatDate(apt.APPOINTMENT_DATE || apt.appointment_date)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full',
                    apt.STATUS === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                    apt.STATUS === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {apt.STATUS || 'Scheduled'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Prescriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Prescriptions</h2>
          <div className="space-y-3">
            {recentPrescriptions.length > 0 ? (
              recentPrescriptions.map((pres: any, idx: number) => (
                <div
                  key={pres.PRESCRIPTION_ID || idx}
                  className="p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <Pill className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{pres.PATIENT_NAME}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(pres.CREATED_AT)}</p>
                      {pres.ITEM_COUNT && (
                        <p className="text-xs text-purple-600 mt-1">{pres.ITEM_COUNT} medicines</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No prescriptions</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 p-6"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/dashboard/appointments" className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer border border-gray-100 hover:border-teal-200">
            <Calendar className="w-6 h-6 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">View Appointments</p>
              <p className="text-xs text-gray-500">Manage your schedule</p>
            </div>
          </a>
          <a href="/dashboard/prescriptions" className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer border border-gray-100 hover:border-teal-200">
            <FileText className="w-6 h-6 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Create Prescription</p>
              <p className="text-xs text-gray-500">Issue new prescription</p>
            </div>
          </a>
          <a href="/dashboard/profile" className="flex items-center gap-3 p-4 bg-white rounded-xl hover:shadow-md transition-shadow cursor-pointer border border-gray-100 hover:border-teal-200">
            <Users className="w-6 h-6 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Edit Profile</p>
              <p className="text-xs text-gray-500">Update your info</p>
            </div>
          </a>
        </div>
      </motion.div>
    </div>
  )
}
