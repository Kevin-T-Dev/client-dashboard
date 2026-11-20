import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ListTodo } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { dateLocale, dayKey, fmtMonth, fmtTime, fmtWeekday } from '@/lib/dates'
import { Button } from '../ui/Button'

/** `pending` marks items still waiting on confirmation (blue, like the pending badge). */
export type CalendarTone = 'brand' | 'accent' | 'muted' | 'task' | 'pending'

export interface CalendarEvent {
  id: string
  start: string
  end: string
  title: string
  tone: CalendarTone
  /** Shown without a time, e.g. a to-do due that day. */
  allDay?: boolean
}

export interface MonthCalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  selectedDay: string
  onSelectDay: (day: string) => void
  events: CalendarEvent[]
  /** Colour used for the selected-day highlight. */
  tone?: 'brand' | 'accent'
}

const MAX_CHIPS = 3

const chipTone: Record<CalendarTone, string> = {
  brand: 'bg-brand-100 text-brand-900',
  accent: 'bg-accent-100 text-accent-900',
  muted: 'bg-stone-100 text-stone-500 line-through',
  task: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200',
  pending: 'bg-blue-100 text-blue-900 ring-1 ring-inset ring-blue-300',
}

const dotTone: Record<CalendarTone, string> = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  muted: 'bg-stone-400',
  task: 'bg-amber-500',
  pending: 'bg-blue-500',
}

export function MonthCalendar({
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  events,
  tone = 'brand',
}: MonthCalendarProps) {
  const { t, i18n } = useTranslation()
  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + index)
      return fmtWeekday(day)
    })
  }, [i18n.language])
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
      const key = dayKey(ev.start)
      const list = map.get(key)
      if (list) list.push(ev)
      else map.set(key, [ev])
    }
    return map
  }, [events])

  const ring = tone === 'brand' ? 'ring-brand-500' : 'ring-accent-500'
  const todayBg = tone === 'brand' ? 'bg-brand-600' : 'bg-accent-600'

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">{fmtMonth(month)}</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('common.previousMonth')}
            onClick={() => onMonthChange(subMonths(month, 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(startOfMonth(new Date()))}>
            {t('common.today')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('common.nextMonth')}
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium tracking-wide text-stone-500 uppercase">
        {weekdays.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200">
        {days.map((date) => {
          const key = dayKey(date)
          const inMonth = isSameMonth(date, month)
          const today = isToday(date)
          const selected = key === selectedDay
          const dayEvents = byDay.get(key) ?? []
          const overflow = dayEvents.length - MAX_CHIPS
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-label={format(date, i18n.language.startsWith('zh') ? 'yyyy年M月d日 EEEE' : 'EEEE d MMMM', { locale: dateLocale() })}
              aria-pressed={selected}
              className={cn(
                'flex min-h-20 flex-col items-stretch gap-1 bg-white p-1.5 text-left transition-colors hover:bg-stone-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 sm:min-h-24',
                !inMonth && 'bg-stone-50/60 text-stone-400',
                selected && cn('relative z-10 ring-2 ring-inset', ring),
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                  today ? cn(todayBg, 'text-white') : inMonth ? 'text-stone-800' : 'text-stone-400',
                )}
              >
                {format(date, 'd')}
              </span>
              <span className="flex flex-col gap-0.5">
                {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                  <span
                    key={ev.id}
                    className={cn(
                      'hidden truncate rounded px-1.5 py-0.5 text-[11px] leading-4 sm:block',
                      chipTone[ev.tone],
                    )}
                    title={ev.allDay ? ev.title : `${fmtTime(ev.start)} ${ev.title}`}
                  >
                    {ev.allDay ? (
                      <ListTodo size={11} className="mr-0.5 inline-block align-[-1px]" aria-hidden />
                    ) : (
                      <span className="font-medium">{fmtTime(ev.start)}</span>
                    )}{' '}
                    {ev.title}
                  </span>
                ))}
                {dayEvents.length > 0 && (
                  <span className="flex gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 4).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn('size-1.5 rounded-full', dotTone[ev.tone])}
                      />
                    ))}
                  </span>
                )}
                {overflow > 0 && (
                  <span className="hidden px-1.5 text-[11px] text-stone-500 sm:block">{t('common.more', { n: overflow })}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
