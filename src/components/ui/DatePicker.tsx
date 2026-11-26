import { Popover } from '@base-ui/react/popover'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { createContext, useContext, useMemo, useState } from 'react'
import { DayPicker, type ChevronProps, type MonthCaptionProps } from 'react-day-picker'
import { enUS, zhCN } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { dayKey, fmtDate, toDate } from '@/lib/dates'
import { isZh } from '@/lib/i18n'

export interface DatePickerProps {
  /** Selected day as `yyyy-MM-dd`, or an empty string when unset. */
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  /** Shows a "Clear" action so the value can be emptied (for optional dates). */
  clearable?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

function CalendarChevron({ orientation }: ChevronProps) {
  return orientation === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />
}

const navButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-brand-500'

const selectBox =
  'h-8 cursor-pointer appearance-none rounded-md border border-stone-200 bg-white py-0 pr-7 pl-2.5 text-sm font-medium text-stone-900 hover:bg-stone-50 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200'

interface CaptionContextValue {
  months: { value: number; label: string }[]
  years: number[]
  goTo: (date: Date) => void
}

const CaptionContext = createContext<CaptionContextValue | null>(null)

/** Month/year dropdowns using native <select> (no nested portal, so clicks aren't swallowed by the popover). */
function MonthCaption({ calendarMonth }: MonthCaptionProps) {
  const ctx = useContext(CaptionContext)
  if (!ctx) return <></>
  const current = calendarMonth.date
  const month = current.getMonth()
  const year = current.getFullYear()

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        className={navButton}
        aria-label="Previous month"
        onClick={() => ctx.goTo(new Date(year, month - 1, 1))}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <select
            className={cn(selectBox, 'min-w-[112px]')}
            value={month}
            onChange={(e) => ctx.goTo(new Date(year, Number(e.target.value), 1))}
          >
            {ctx.months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
        <div className="relative">
          <select
            className={cn(selectBox, 'min-w-[76px]')}
            value={year}
            onChange={(e) => ctx.goTo(new Date(Number(e.target.value), month, 1))}
          >
            {ctx.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
      </div>
      <button
        type="button"
        className={navButton}
        aria-label="Next month"
        onClick={() => ctx.goTo(new Date(year, month + 1, 1))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/** A date field that opens a calendar popover. Built on Base UI Popover and react-day-picker. */
export function DatePicker({ value, onValueChange, placeholder, clearable, disabled, id, className }: DatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [displayMonth, setDisplayMonth] = useState<Date>(value ? toDate(value) : new Date())
  const selected = value ? toDate(value) : undefined

  const captionValue = useMemo<CaptionContextValue>(() => {
    const locale = isZh() ? 'zh-CN' : 'en-US'
    const months = Array.from({ length: 12 }, (_, m) => ({
      value: m,
      label: new Date(2000, m, 1).toLocaleDateString(locale, { month: 'long' }),
    }))
    const base = new Date().getFullYear()
    const selectedYear = selected?.getFullYear()
    const start = Math.min(base - 15, selectedYear ?? base)
    const end = Math.max(base + 15, selectedYear ?? base)
    const years = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    return { months, years, goTo: setDisplayMonth }
  }, [selected])

  function handleOpenChange(next: boolean) {
    // Re-sync the visible month to the selected date (or today) each time the calendar opens.
    if (next) setDisplayMonth(selected ?? new Date())
    setOpen(next)
  }

  function choose(next: string) {
    onValueChange(next)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-left text-sm text-stone-900 shadow-xs select-none hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 data-popup-open:border-brand-300',
          className,
        )}
      >
        <CalendarDays size={16} className="shrink-0 text-stone-400" />
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-stone-400')}>
          {selected ? fmtDate(selected, true) : (placeholder ?? t('common.pickDate'))}
        </span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner className="z-50 outline-none" sideOffset={6} align="start">
          <Popover.Popup className="origin-(--transform-origin) rounded-xl border border-stone-200 bg-white p-3 shadow-lg outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <CaptionContext.Provider value={captionValue}>
              <DayPicker
                mode="single"
                selected={selected}
                month={displayMonth}
                onMonthChange={setDisplayMonth}
                onSelect={(date) => date && choose(dayKey(date))}
                locale={isZh() ? zhCN : enUS}
                showOutsideDays
                autoFocus
                hideNavigation
                components={{ Chevron: CalendarChevron, MonthCaption }}
                classNames={{
                  root: 'text-sm',
                  months: 'relative',
                  month: 'flex flex-col gap-2',
                  month_caption: 'flex h-8 items-center',
                  month_grid: 'border-collapse',
                  weekdays: '',
                  weekday: 'size-9 text-xs font-medium text-stone-400',
                  week: '',
                  day: 'p-0 text-center',
                  day_button:
                    'size-9 cursor-pointer rounded-md text-sm text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-brand-500',
                  today: '[&>button]:font-semibold [&>button]:text-brand-700',
                  outside: '[&>button]:text-stone-300',
                  selected: '[&>button]:bg-brand-600 [&>button]:text-white! [&>button]:hover:bg-brand-600',
                  disabled: 'opacity-40',
                  hidden: 'invisible',
                }}
              />
            </CaptionContext.Provider>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
              <Button variant="ghost" size="sm" onClick={() => choose(dayKey(new Date()))}>
                {t('common.today')}
              </Button>
              {clearable && value && (
                <Button variant="ghost" size="sm" onClick={() => choose('')}>
                  {t('common.clearDate')}
                </Button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
