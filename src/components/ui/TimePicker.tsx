import { Clock } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTime, parseTime, TimepickerUI, type ConfirmEventData } from 'timepicker-ui'
import 'timepicker-ui/main.css'
import { inputClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

export interface TimePickerProps {
  /** Selected time as `HH:mm` (24-hour), or an empty string when unset. */
  value: string
  onValueChange: (value: string) => void
  /** Minute step on the clock face. Defaults to 5. */
  step?: number
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

type ClockType = '12h' | '24h'

/** Convert the picker's confirm payload to `HH:mm`. */
function toKey(data: ConfirmEventData, clockType: ClockType): string | null {
  if (!data.hour || !data.minutes) return null
  const parsed = parseTime(formatTime({ hour: data.hour, minutes: data.minutes, type: data.type }, { clockType }), {
    clockType: '24h',
  })
  return parsed ? `${parsed.hour.padStart(2, '0')}:${parsed.minutes.padStart(2, '0')}` : null
}

/** Text the picker shows in the field for an `HH:mm` value. */
function toDisplay(value: string, clockType: ClockType): string {
  const parsed = value ? parseTime(value, { clockType }) : null
  return parsed ? formatTime(parsed, { clockType }) : ''
}

/**
 * A time field that opens the timepicker-ui clock dialog.
 * English uses a 12-hour clock and Chinese a 24-hour clock.
 */
export function TimePicker({ value, onValueChange, step = 5, placeholder, disabled, id, className }: TimePickerProps) {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<TimepickerUI | null>(null)
  const onChangeRef = useRef(onValueChange)
  const valueRef = useRef(value)
  const clockType: ClockType = i18n.language.startsWith('zh') ? '24h' : '12h'

  useEffect(() => {
    onChangeRef.current = onValueChange
    valueRef.current = value
  })

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    // Mount the clock next to the surrounding dialog, not inside it: the dialog is
    // transformed (which breaks the clock's fixed positioning), and its portal
    // container keeps clicks on the clock from counting as outside clicks.
    const host = input.closest<HTMLElement>('[role="dialog"]')?.parentElement ?? document.body
    const picker = new TimepickerUI(input, {
      clock: { type: clockType, incrementMinutes: step },
      ui: { appendTo: host, cssClass: 'tp-brand' },
      labels: {
        ok: t('timePicker.ok'),
        cancel: t('common.cancel'),
        time: t('timePicker.title'),
        mobileTime: t('timePicker.enterTime'),
        hour: t('timePicker.hour'),
        minute: t('timePicker.minute'),
        mobileHour: t('timePicker.hour'),
        mobileMinute: t('timePicker.minute'),
      },
    })
    picker.create()
    if (valueRef.current) picker.setValue(valueRef.current)
    const off = picker.on('confirm', (data) => {
      const next = toKey(data, clockType)
      if (next) onChangeRef.current(next)
    })
    pickerRef.current = picker
    return () => {
      off()
      picker.destroy()
      pickerRef.current = null
    }
  }, [clockType, step, t])

  // Keep the field in sync when the value changes from outside the picker.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const display = toDisplay(value, clockType)
    if (input.value !== display) {
      if (value) pickerRef.current?.setValue(value)
      input.value = display
    }
  }, [value, clockType])

  return (
    <div className={cn('relative', className)}>
      <Clock size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
      <input
        ref={inputRef}
        id={id}
        readOnly
        disabled={disabled}
        defaultValue={toDisplay(value, clockType)}
        placeholder={placeholder ?? t('timePicker.placeholder')}
        className={cn(inputClass, 'cursor-pointer pl-9 hover:bg-stone-50')}
      />
    </div>
  )
}
