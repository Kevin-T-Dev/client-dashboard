import { Trash } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { sessionsApi } from '@/db/api'
import type { LessonPlan, SessionKind, SessionRole, SessionStatus, Student, YogaSession } from '@/db/types'
import { buildRange, splitRange } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'

const CUSTOM = 'custom'

function splitMinutes(total: number) {
  const safe = Number.isFinite(total) && total > 0 ? Math.round(total) : 60
  return { hours: String(Math.floor(safe / 60)), minutes: String(safe % 60) }
}

export interface SessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: YogaSession
  defaultDay: string
  students: Student[]
  plans: LessonPlan[]
  onDelete?: (session: YogaSession) => void
}

const NONE = 'none'

export function SessionDialog(props: SessionDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, session } = props
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={session ? t('session.edit') : t('session.new')}
      description={session ? undefined : t('session.intro')}
      size="lg"
    >
      <SessionForm key={session?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function SessionForm({ onOpenChange, session, defaultDay, students, plans, onDelete }: SessionDialogProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const initial = session ? splitRange(session.start, session.end) : { dateKey: defaultDay, time: '09:00', durationMinutes: 60 }
  const [title, setTitle] = useState(session?.title ?? '')
  const [kind, setKind] = useState<SessionKind>(session?.kind ?? 'one-on-one')
  const [role, setRole] = useState<SessionRole>(session?.role ?? 'teaching')
  const teaching = role === 'teaching'
  const [status, setStatus] = useState<SessionStatus>(session?.status ?? 'planned')
  const [dateKey, setDateKey] = useState(initial.dateKey)
  const [time, setTime] = useState(initial.time)
  const preset = labels.durations.some((d) => d.value === String(initial.durationMinutes))
  const initialParts = splitMinutes(initial.durationMinutes)
  const [durationMode, setDurationMode] = useState(preset ? String(initial.durationMinutes) : CUSTOM)
  const [hours, setHours] = useState(initialParts.hours)
  const [minutes, setMinutes] = useState(initialParts.minutes)
  const [studentId, setStudentId] = useState(session?.studentId ?? NONE)
  const [planId, setPlanId] = useState(session?.lessonPlanId ?? NONE)
  const [location, setLocation] = useState(session?.location ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const studentItems = [{ value: NONE, label: t('session.noStudent') }, ...students.map((s) => ({ value: s.id, label: s.name }))]
  const planItems = [{ value: NONE, label: t('session.noPlan') }, ...plans.map((p) => ({ value: p.id, label: p.title }))]
  const durationItems = [...labels.durations, { value: CUSTOM, label: t('common.custom') }]

  function resolvedMinutes() {
    if (durationMode !== CUSTOM) return Number(durationMode) || 60
    const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0)
    return total
  }

  function pickDuration(value: string) {
    if (value === CUSTOM && durationMode !== CUSTOM) {
      const parts = splitMinutes(Number(durationMode) || 60)
      setHours(parts.hours)
      setMinutes(parts.minutes)
    }
    setDurationMode(value)
  }

  function pickStudent(id: string) {
    setStudentId(id)
    const name = students.find((s) => s.id === id)?.name
    if (name && teaching && kind === 'one-on-one' && !title.trim()) setTitle(t('session.titleWith', { name }))
  }

  async function save() {
    if (!title.trim()) return setError(t('session.needTitle'))
    if (!dateKey || !time) return setError(t('session.needWhen'))
    const durationMinutes = resolvedMinutes()
    if (durationMinutes < 5 || durationMinutes > 12 * 60) {
      return setError(t('session.badDuration'))
    }
    setError(null)
    setSaving(true)
    try {
      const range = buildRange(dateKey, time, durationMinutes)
      const data = {
        title: title.trim(),
        kind,
        role,
        status,
        ...range,
        // Students and lesson plans belong to classes Kelly teaches.
        studentId: !teaching || studentId === NONE ? undefined : studentId,
        lessonPlanId: !teaching || planId === NONE ? undefined : planId,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      }
      if (session) {
        await sessionsApi.update(session.id, data)
        notify(t('session.updated'), data.title)
      } else {
        await sessionsApi.create(data)
        notify(t('session.added'), data.title)
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
      <FormField label={t('common.title')} error={error && !title.trim() ? error : undefined}>
        <TextInput value={title} onValueChange={setTitle} placeholder={t('session.titlePh')} autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('session.role')} hint={teaching ? undefined : t('session.roleHint')}>
          <AppSelect value={role} onValueChange={setRole} items={labels.sessionRoles} />
        </FormField>
        <FormField label={t('session.type')}>
          <AppSelect value={kind} onValueChange={setKind} items={labels.sessionKinds} />
        </FormField>
        <FormField label={t('common.status')}>
          <AppSelect value={status} onValueChange={setStatus} items={labels.sessionStatuses} />
        </FormField>
        <FormField label={t('common.date')}>
          <TextInput type="date" value={dateKey} onValueChange={setDateKey} required />
        </FormField>
        <FormField label={t('common.startTime')}>
          <TextInput type="time" value={time} onValueChange={setTime} required />
        </FormField>
        <FormField label={t('common.duration')} hint={durationMode === CUSTOM ? t('session.customHint') : undefined}>
          <AppSelect value={durationMode} onValueChange={pickDuration} items={durationItems} />
          {durationMode === CUSTOM && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-stone-500">
                {t('common.hours')}
                <TextInput type="number" min={0} max={12} step={1} value={hours} onValueChange={setHours} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-stone-500">
                {t('common.minutes')}
                <TextInput type="number" min={0} max={59} step={5} value={minutes} onValueChange={setMinutes} />
              </label>
            </div>
          )}
        </FormField>
        {teaching && (
          <>
            <FormField label={t('session.student')} hint={t('session.studentHint')}>
              <AppSelect value={studentId} onValueChange={pickStudent} items={studentItems} />
            </FormField>
            <FormField label={t('session.plan')}>
              <AppSelect value={planId} onValueChange={setPlanId} items={planItems} />
            </FormField>
          </>
        )}
        <FormField label={t('common.location')} className="sm:col-span-2">
          <TextInput value={location} onValueChange={setLocation} placeholder={t('session.locationPh')} />
        </FormField>
      </div>

      <FormField label={t('common.notes')}>
        <TextArea value={notes} onValueChange={setNotes} placeholder={t('session.notesPh')} />
      </FormField>

      {error && !(error && !title.trim()) && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {session && onDelete && (
          <Button
            variant="danger"
            className="mr-auto"
            leadingIcon={<Trash size={14} />}
            onClick={() => onDelete(session)}
          >
            {t('common.delete')}
          </Button>
        )}
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {session ? t('common.save') : t('session.add')}
        </Button>
      </div>
    </form>
  )
}
