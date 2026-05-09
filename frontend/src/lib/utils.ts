import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} ${formatTime(dateString)}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function getInitials(name?: string | null): string {
  return String(name || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getRoleBadgeColor(role: string): string {
  const map: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    doctor: 'bg-blue-100 text-blue-700 border-blue-200',
    pharmacist: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    supplier: 'bg-amber-100 text-amber-700 border-amber-200',
    patient: 'bg-violet-100 text-violet-700 border-violet-200',
  }
  return map[role?.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export function getStatusBadgeColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    normal: 'bg-emerald-100 text-emerald-700',
    low: 'bg-amber-100 text-amber-700',
    critical: 'bg-red-100 text-red-700',
    expired: 'bg-gray-100 text-gray-600',
    pending: 'bg-amber-100 text-amber-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  }
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}
