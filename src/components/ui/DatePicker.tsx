import { Popover } from '@base-ui/react/popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DayPicker, type ChevronProps } from 'react-day-picker'
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
  'inline-flex size-8 items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40'

/** A date field that opens a calendar popover. Built on Base UI Popover and react-day-picker. */
export function DatePicker({ value, onValueChange, placeholder, clearable, disabled, id, className }: DatePickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = value ? toDate(value) : undefined

  function choose(next: string) {
    onValueChange(next)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
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
            <DayPicker
              mode="single"
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) => date && choose(dayKey(date))}
              locale={isZh() ? zhCN : enUS}
              showOutsideDays
              autoFocus
              components={{ Chevron: CalendarChevron }}
              classNames={{
                root: 'text-sm',
                months: 'relative',
                month: 'flex flex-col gap-2',
                month_caption: 'flex h-8 items-center justify-center',
                caption_label: 'text-sm font-semibold text-stone-900',
                nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
                button_previous: navButton,
                button_next: navButton,
                month_grid: 'border-collapse',
                weekdays: '',
                weekday: 'size-9 text-xs font-medium text-stone-400',
                week: '',
                day: 'p-0 text-center',
                day_button:
                  'size-9 rounded-md text-sm text-stone-800 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-brand-500',
                today: '[&>button]:font-semibold [&>button]:text-brand-700',
                outside: '[&>button]:text-stone-300',
                selected: '[&>button]:bg-brand-600 [&>button]:text-white! [&>button]:hover:bg-brand-600',
                disabled: 'opacity-40',
                hidden: 'invisible',
              }}
            />
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
