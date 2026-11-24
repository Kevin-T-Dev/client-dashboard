import type { BeautyPackage } from '@/db/types'
import { todayKey } from './dates'

export type PackageStatus = 'active' | 'completed' | 'expired' | 'expiring' | 'incomplete'

export function sessionsRemaining(p: BeautyPackage): number {
  const total = p.sessionsTotal ?? 0
  const used = p.sessionsUsed ?? 0
  return Math.max(0, total - used)
}

export function perSessionPrice(p: BeautyPackage): number {
  const total = p.sessionsTotal ?? 0
  const price = p.totalPrice ?? 0
  return total > 0 ? price / total : price
}

export function daysUntil(dateKey: string, today = todayKey()): number {
  const a = new Date(`${today}T00:00:00`).getTime()
  const b = new Date(`${dateKey}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function packageStatus(p: BeautyPackage, today = todayKey()): PackageStatus {
  // If required fields for status calculation are missing, return 'incomplete'
  if (p.sessionsTotal === undefined || p.sessionsUsed === undefined) return 'incomplete'
  if (sessionsRemaining(p) === 0) return 'completed'
  if (p.expiresAt && p.expiresAt < today) return 'expired'
  if (p.expiresAt && daysUntil(p.expiresAt, today) <= 30) return 'expiring'
  return 'active'
}

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  active: 'Active',
  completed: 'Fully used',
  expired: 'Expired',
  expiring: 'Expiring soon',
  incomplete: 'Incomplete',
}
