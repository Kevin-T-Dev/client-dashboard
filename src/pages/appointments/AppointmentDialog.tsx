import { Trash } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { DatePicker } from '@/components/ui/DatePicker'
import { TimePicker } from '@/components/ui/TimePicker'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { appointmentsApi } from '@/db/api'
import type { Appointment, AppointmentCategory, AppointmentStatus, BeautyPackage } from '@/db/types'
import { buildRange, splitRange } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { packageStatus, sessionsRemaining } from '@/lib/packages'

export interface AppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment
  defaultDay: string
  packages: BeautyPackage[]
  onDelete?: (appointment: Appointment) => void
}

const NONE = 'none'

export function AppointmentDialog(props: AppointmentDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, appointment } = props
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={appointment ? t('appointmentForm.edit') : t('appointmentForm.new')}
      description={appointment ? undefined : t('appointmentForm.intro')}
      size="lg"
    >
      <AppointmentForm key={appointment?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function AppointmentForm({
  onOpenChange,
  appointment,
  defaultDay,
  packages,
  onDelete,
}: AppointmentDialogProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const initial = appointment
    ? splitRange(appointment.start, appointment.end)
    : { dateKey: defaultDay, time: '14:00', durationMinutes: 60 }
  const [title, setTitle] = useState(appointment?.title ?? '')
  const [category, setCategory] = useState<AppointmentCategory>(appointment?.category ?? 'facial')
  const [provider, setProvider] = useState(appointment?.provider ?? '')
  const [location, setLocation] = useState(appointment?.location ?? '')
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status ?? 'upcoming')
  const [dateKey, setDateKey] = useState(initial.dateKey)
  const [time, setTime] = useState(initial.time)
  const [hours, setHours] = useState(String(Math.floor(initial.durationMinutes / 60)))
  const [minutes, setMinutes] = useState(String(initial.durationMinutes % 60))
  const [packageId, setPackageId] = useState(appointment?.packageId ?? NONE)
  const [notes, setNotes] = useState(appointment?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const packageItems = [
    { value: NONE, label: t('appointmentForm.noPackage') },
    ...packages.map((pkg) => {
      const status = packageStatus(pkg)
      const label = status === 'incomplete'
        ? [pkg.name, pkg.provider, labels.packageStatusLabel.incomplete].join(' · ')
        : t('appointmentForm.packageOption', { name: pkg.name, provider: pkg.provider, left: sessionsRemaining(pkg) })
      return { value: pkg.id, label: status === 'expired' ? `${label} ${t('appointmentForm.expired')}` : label }
    }),
  ]

  function pickPackage(id: string) {
    setPackageId(id)
    const pkg = packages.find((p) => p.id === id)
    if (!pkg) return
    // The package record holds the shop and address, so picking one fills them in.
    setProvider(pkg.provider)
    if (pkg.location) setLocation(pkg.location)
    if (!title.trim()) setTitle(pkg.name.replace(/\s*x\s*\d+\s*$/i, ''))
    setCategory(pkg.category)
  }

  async function save() {
    if (!title.trim()) return setError(t('appointmentForm.needTitle'))
    if (!provider.trim()) return setError(t('appointmentForm.needStore'))
    if (!dateKey || !time) return setError(t('appointmentForm.needWhen'))
    const duration = Number(hours) * 60 + Number(minutes)
    const end = new Date(Date.parse(`${dateKey}T${time}`) + duration * 60_000)
    if (![hours, minutes].every((value) => /^\d*$/.test(value)) || Number(minutes) > 59 || duration < 1 || Number.isNaN(end.getTime())) {
      return setError(t('appointmentForm.needDuration'))
    }
    setError(null)
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        category,
        provider: provider.trim(),
        location: location.trim() || undefined,
        status,
        ...buildRange(dateKey, time, duration),
        packageId: packageId === NONE ? undefined : packageId,
        notes: notes.trim() || undefined,
      }
      if (appointment) {
        await appointmentsApi.update(appointment.id, data)
        notify(t('appointmentForm.updated'), data.title)
      } else {
        await appointmentsApi.create(data)
        notify(t('appointmentForm.booked'), t('packageForm.addedBody', { name: data.title, provider: data.provider }))
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <FormField label={t('appointmentForm.package')} hint={t('appointmentForm.packageHint')}>
        <AppSelect value={packageId} onValueChange={pickPackage} items={packageItems} tone="accent" />
      </FormField>

      <FormField label={t('common.title')}>
        <TextInput value={title} onValueChange={setTitle} placeholder={t('appointmentForm.titlePh')} autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('appointmentForm.store')}>
          <TextInput value={provider} onValueChange={setProvider} placeholder={t('appointmentForm.storePh')} />
        </FormField>
        <FormField label={t('common.category')}>
          <AppSelect value={category} onValueChange={setCategory} items={labels.categories} tone="accent" />
        </FormField>
        <FormField label={t('common.location')} hint={t('appointmentForm.locationHint')} className="sm:col-span-2">
          <TextInput value={location} onValueChange={setLocation} placeholder={t('appointmentForm.locationPh')} />
        </FormField>
        <FormField label={t('common.date')}>
          <DatePicker value={dateKey} onValueChange={setDateKey} />
        </FormField>
        <FormField label={t('common.startTime')}>
          <TimePicker value={time} onValueChange={setTime} />
        </FormField>
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-sm font-medium text-stone-700">{t('common.duration')}</legend>
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('appointmentForm.hours')}>
              <TextInput type="number" min={0} step={1} placeholder="0" value={hours} onValueChange={setHours} />
            </FormField>
            <FormField label={t('appointmentForm.minutes')}>
              <TextInput type="number" min={0} max={59} step={1} placeholder="0" value={minutes} onValueChange={setMinutes} />
            </FormField>
          </div>
        </fieldset>
        <FormField label={t('common.status')}>
          <AppSelect value={status} onValueChange={setStatus} items={labels.appointmentStatuses} tone="accent" />
        </FormField>
      </div>

      <FormField label={t('common.notes')}>
        <TextArea value={notes} onValueChange={setNotes} placeholder={t('appointmentForm.notesPh')} />
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {appointment && onDelete && (
          <Button variant="danger" className="mr-auto" leadingIcon={<Trash size={14} />} onClick={() => onDelete(appointment)}>
            {t('common.delete')}
          </Button>
        )}
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="accent" disabled={saving}>
          {appointment ? t('common.save') : t('appointmentForm.book')}
        </Button>
      </div>
    </form>
  )
}
