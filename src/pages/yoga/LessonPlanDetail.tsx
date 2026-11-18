import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Pencil, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { MediaImage } from '@/components/ui/MediaImage'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { sessionsApi, studentsApi } from '@/db/api'
import type { LessonPlan, Student } from '@/db/types'
import { cn } from '@/lib/cn'
import { buildRange, fmtDate, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'

export interface LessonPlanDetailProps {
  plan: LessonPlan | null
  students: Student[]
  onClose: () => void
  onEdit: (plan: LessonPlan) => void
}

export function LessonPlanDetail({ plan, students, onClose, onEdit }: LessonPlanDetailProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (!plan) setCreating(false)
  }, [plan])
  return (
    <>
    <AppDialog
      open={plan !== null}
      onOpenChange={(open) => {
        if (!open && creating) return
        if (!open) onClose()
      }}
      title={plan?.title ?? ''}
      description={
        plan ? (
          <span className="inline-flex items-center gap-3">
            <span>{labels.planLevelLabel[plan.level]}</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {t('common.min', { n: plan.durationMinutes })}
            </span>
            <span>{t('plans.updated', { date: fmtDate(plan.updatedAt) })}</span>
          </span>
        ) : undefined
      }
      size="xl"
      footer={
        plan ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t('plans.close')}
            </Button>
            <Button variant="secondary" leadingIcon={<Pencil size={14} />} onClick={() => onEdit(plan)}>
              {t('plans.editPlan')}
            </Button>
            <Button leadingIcon={<CalendarPlus size={14} />} onClick={() => setCreating(true)}>
              {t('plans.createLesson')}
            </Button>
          </>
        ) : undefined
      }
    >
      {plan && <DetailBody key={plan.id} plan={plan} students={students} />}
    </AppDialog>
    {plan && (
      <CreateLessonDialog
        open={creating}
        plan={plan}
        students={students}
        onOpenChange={setCreating}
      />
    )}
    </>
  )
}

function CreateLessonDialog({
  open,
  plan,
  students,
  onOpenChange,
}: {
  open: boolean
  plan: LessonPlan
  students: Student[]
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('lesson.title')}
      description={t('lesson.intro', { plan: plan.title, minutes: plan.durationMinutes })}
      size="lg"
    >
      <CreateLessonForm key={`${plan.id}-${open}`} plan={plan} students={students} onOpenChange={onOpenChange} />
    </AppDialog>
  )
}

function CreateLessonForm({
  plan,
  students,
  onOpenChange,
}: {
  plan: LessonPlan
  students: Student[]
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const assigned = students.filter((s) => s.assignedPlanIds.includes(plan.id))
  const choices = assigned.length ? assigned : students
  const [studentId, setStudentId] = useState(choices[0]?.id ?? '')
  const [dateKey, setDateKey] = useState(todayKey())
  const [time, setTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const student = students.find((s) => s.id === studentId)
  const title = student ? t('lesson.titleWith', { name: student.name }) : ''
  const items = choices.map((s) => ({ value: s.id, label: s.name }))

  async function save() {
    if (!student) return setError(students.length ? t('lesson.chooseStudent') : t('lesson.needStudent'))
    if (!dateKey || !time) return setError(t('lesson.needWhen'))
    setError(null)
    setSaving(true)
    try {
      await sessionsApi.create({
        title,
        kind: 'one-on-one',
        status: 'planned',
        ...buildRange(dateKey, time, plan.durationMinutes),
        studentId: student.id,
        lessonPlanId: plan.id,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      notify(t('lesson.added'), title)
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
      <FormField label={t('lesson.student')} hint={assigned.length ? t('lesson.assignedHint') : t('lesson.unassignedHint')}>
        <AppSelect
          value={studentId}
          onValueChange={setStudentId}
          items={items.length ? items : [{ value: '', label: t('lesson.none') }]}
          disabled={!items.length}
        />
      </FormField>
      <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
        {t('lesson.titleLine', { title: title || t('lesson.titleFallback') })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('common.date')}>
          <TextInput type="date" value={dateKey} onValueChange={setDateKey} required />
        </FormField>
        <FormField label={t('common.startTime')}>
          <TextInput type="time" value={time} onValueChange={setTime} required />
        </FormField>
      </div>
      <FormField label={t('common.location')}>
        <TextInput value={location} onValueChange={setLocation} placeholder={t('lesson.locationPh')} />
      </FormField>
      <FormField label={t('common.notes')}>
        <TextArea value={notes} onValueChange={setNotes} placeholder={t('lesson.notesPh')} />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={saving || !students.length}>
          {t('lesson.add')}
        </Button>
      </div>
    </form>
  )
}

function DetailBody({ plan, students }: { plan: LessonPlan; students: Student[] }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const images = plan.imageIds
  const assignedTo = students.filter((s) => s.assignedPlanIds.includes(plan.id))
  const unassigned = students.filter((s) => !s.assignedPlanIds.includes(plan.id))
  const pending = unassigned.find((s) => s.id === pendingId)
  const current = images[Math.min(index, images.length - 1)]

  async function assign() {
    if (!pending) return
    setBusy(true)
    try {
      await studentsApi.update(pending.id, { assignedPlanIds: [...pending.assignedPlanIds, plan.id] })
      notify(t('plans.assignedToast', { name: pending.name }), plan.title)
      setPendingId(null)
    } finally {
      setBusy(false)
    }
  }

  async function unassign(student: Student) {
    await studentsApi.update(student.id, {
      assignedPlanIds: student.assignedPlanIds.filter((id) => id !== plan.id),
    })
    notify(t('plans.removed'), student.name)
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-2">
        {current ? (
          <div className="relative overflow-hidden rounded-xl bg-stone-100">
            <MediaImage id={current} className="max-h-[60vh] w-full object-contain" alt={plan.title} />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={t('common.previousImage')}
                  onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label={t('common.nextImage')}
                  onClick={() => setIndex((i) => (i + 1) % images.length)}
                  className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow hover:bg-white"
                >
                  <ChevronRight size={18} />
                </button>
                <span className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
                  {Math.min(index, images.length - 1) + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-stone-200 text-sm text-stone-400">
            {t('plans.noImages')}
          </div>
        )}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'size-16 shrink-0 overflow-hidden rounded-lg border-2',
                  i === index ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <MediaImage id={id} className="size-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <section>
          <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('plans.focus')}</h4>
          {plan.focusAreas.length ? (
            <div className="flex flex-wrap gap-1">
              {plan.focusAreas.map((area) => (
                <Badge key={area} tone="brand">
                  {area}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">{t('plans.noneTagged')}</p>
          )}
        </section>
        <section>
          <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('plans.description')}</h4>
          <p className="text-sm whitespace-pre-wrap text-stone-700">
            {plan.description || t('plans.noDescription')}
          </p>
        </section>
        <section>
          <h4 className="mb-1.5 text-xs font-semibold tracking-wide text-stone-500 uppercase">{t('plans.assignedTo')}</h4>
          {assignedTo.length ? (
            <ul className="flex flex-col gap-1">
              {assignedTo.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 py-1.5 pr-1.5 pl-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-800">{s.name}</p>
                    <p className="text-xs text-stone-500">
                      {t('plans.shared', { n: s.focusAreas.filter((area) => plan.focusAreas.includes(area)).length })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('plans.unassign', { name: s.name })}
                    onClick={() => void unassign(s)}
                  >
                    <X size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">{t('plans.notAssigned')}</p>
          )}
          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 p-3">
            <p className="text-sm font-medium text-stone-700">{t('plans.assignStudent')}</p>
            {students.length === 0 ? (
              <p className="text-xs text-stone-500">{t('plans.noStudentsYet')}</p>
            ) : unassigned.length === 0 ? (
              <p className="text-xs text-stone-500">{t('plans.allAssigned')}</p>
            ) : (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <AppSelect
                    value={pendingId}
                    onValueChange={setPendingId}
                    items={unassigned.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder={t('plans.chooseStudent')}
                  />
                </div>
                <Button leadingIcon={<UserPlus size={14} />} disabled={!pending || busy} onClick={() => void assign()}>
                  {t('plans.assignAction')}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
