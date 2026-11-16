import {
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  isSameYear,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
  type Locale,
} from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import i18n, { isZh } from '@/lib/i18n'

export function dateLocale(): Locale {
  return isZh() ? zhCN : enUS
}

export const DAY_KEY = 'yyyy-MM-dd'

export function toDate(iso: string): Date {
  return parseISO(iso)
}

export function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? parseISO(d) : d, DAY_KEY)
}

export function todayKey(): string {
  return format(new Date(), DAY_KEY)
}

export function fmtTime(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d
  return format(date, isZh() ? 'HH:mm' : 'h:mm a', { locale: dateLocale() })
}

export function fmtDate(d: Date | string, withYear = false): string {
  const date = typeof d === 'string' ? parseISO(d) : d
  const year = withYear || !isSameYear(date, new Date())
  const pattern = isZh() ? (year ? 'yyyy年M月d日' : 'M月d日') : year ? 'EEE, d MMM yyyy' : 'EEE, d MMM'
  return format(date, pattern, { locale: dateLocale() })
}

export function fmtMonth(d: Date): string {
  return format(d, isZh() ? 'yyyy年M月' : 'MMMM yyyy', { locale: dateLocale() })
}

export function fmtWeekday(d: Date): string {
  return format(d, isZh() ? 'EEEEE' : 'EEE', { locale: dateLocale() })
}

export function fmtDayLabel(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d
  if (isToday(date)) return i18n.t('common.today')
  if (isTomorrow(date)) return i18n.t('common.tomorrow')
  return fmtDate(date)
}

export function fmtRange(startIso: string, endIso: string): string {
  const s = parseISO(startIso)
  const e = parseISO(endIso)
  if (isSameDay(s, e)) return `${fmtTime(s)} - ${fmtTime(e)}`
  return `${fmtDate(s)} ${fmtTime(s)} - ${fmtDate(e)} ${fmtTime(e)}`
}

export function fmtDuration(startIso: string, endIso: string): string {
  const mins = differenceInMinutes(parseISO(endIso), parseISO(startIso))
  if (mins < 60) return i18n.t('common.min', { n: mins })
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? i18n.t('common.hoursMinutes', { h, m }) : i18n.t('common.hoursShort', { n: h })
}

/** Build ISO start/end from a date key, a "HH:mm" time and a duration in minutes. */
export function buildRange(dateKey: string, time: string, durationMinutes: number) {
  const [h, m] = time.split(':').map(Number)
  const start = new Date(`${dateKey}T00:00:00`)
  start.setHours(h ?? 0, m ?? 0, 0, 0)
  const end = addMinutes(start, durationMinutes)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function splitRange(startIso: string, endIso: string) {
  const s = parseISO(startIso)
  return {
    dateKey: format(s, DAY_KEY),
    time: format(s, 'HH:mm'),
    durationMinutes: differenceInMinutes(parseISO(endIso), s),
  }
}

export function startOfToday(): Date {
  return startOfDay(new Date())
}
