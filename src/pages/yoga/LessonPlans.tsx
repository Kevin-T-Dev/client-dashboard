import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpen,
  Check,
  Clock,
  Flower2,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/Field'
import { MediaImage } from '@/components/ui/MediaImage'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { deleteLessonPlanDeep, studentsApi } from '@/db/api'
import { db } from '@/db/db'
import type { LessonPlan, Student } from '@/db/types'
import { cn } from '@/lib/cn'
import { useAppLabels } from '@/lib/labels'
import { rankPlansForStudent, type PlanMatch } from '@/lib/recommend'
import { LessonPlanDetail } from './LessonPlanDetail'
import { LessonPlanDialog } from './LessonPlanDialog'
import { StudentDialog } from './StudentDialog'

const ALL = 'all'

export function LessonPlans() {
  const { t } = useTranslation()
  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), []) ?? []
  const students = useLiveQuery(() => db.students.orderBy('name').toArray(), []) ?? []

  const [studentId, setStudentId] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: LessonPlan }>({ open: false })
  const [studentDialog, setStudentDialog] = useState<{ open: boolean; student?: Student }>({ open: false })
  const [detail, setDetail] = useState<LessonPlan | null>(null)
  const [deleting, setDeleting] = useState<LessonPlan | null>(null)

  const student = students.find((s) => s.id === studentId)

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of plans) for (const t of p.focusAreas) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [plans])

  const filtered = plans.filter((p) => {
    if (tag && !p.focusAreas.includes(tag)) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.focusAreas.some((t) => t.includes(q))
    )
  })

  const ranked: PlanMatch[] = student
    ? rankPlansForStudent(student, filtered)
    : filtered.map((plan) => ({ plan, matched: [], coverage: 0, assigned: false }))

  async function toggleAssign(match: PlanMatch) {
    if (!student) return
    const ids = match.assigned
      ? student.assignedPlanIds.filter((id) => id !== match.plan.id)
      : [...student.assignedPlanIds, match.plan.id]
    await studentsApi.update(student.id, { assignedPlanIds: ids })
    notify(
      match.assigned ? t('plans.removed') : t('plans.assignedToast', { name: student.name }),
      match.plan.title,
    )
  }

  const studentItems = [
    { value: ALL, label: t('plans.allPlans') },
    ...students.map((s) => ({ value: s.id, label: s.name })),
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* ----------------------------------------------------------- */}
      {/* Student panel                                                 */}
      {/* ----------------------------------------------------------- */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader
            icon={<Sparkles size={16} />}
            title={t('plans.recommend')}
            description={t('plans.recommendHint')}
          />
          <CardBody className="flex flex-col gap-4">
            <AppSelect value={studentId} onValueChange={setStudentId} items={studentItems} />
            {student ? (
              <div className="flex flex-col gap-3 rounded-lg bg-brand-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-brand-900">{student.name}</p>
                    <p className="text-xs text-brand-800/70">
                      {student.assignedPlanIds.length === 1
                        ? t('plans.planCount', { n: student.assignedPlanIds.length })
                        : t('plans.planCount_other', { n: student.assignedPlanIds.length })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('plans.editStudent')}
                    onClick={() => setStudentDialog({ open: true, student })}
                  >
                    <Pencil size={14} />
                  </Button>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-800/70 uppercase">{t('plans.focus')}</p>
                  {student.focusAreas.length ? (
                    <div className="flex flex-wrap gap-1">
                      {student.focusAreas.map((area) => (
                        <Badge key={area} tone="brand" className="bg-white">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-brand-800/70">{t('plans.noFocusYet')}</p>
                  )}
                </div>
                {student.goals && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-800/70 uppercase">{t('student.goals')}</p>
                    <p className="text-sm text-brand-900">{student.goals}</p>
                  </div>
                )}
                {student.notes && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-800/70 uppercase">{t('plans.notes')}</p>
                    <p className="text-sm text-brand-900">{student.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                {t('plans.pickStudent')}
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<Users size={16} />}
            title={t('plans.students')}
            actions={
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<UserPlus size={14} />}
                onClick={() => setStudentDialog({ open: true })}
              >
                {t('plans.add')}
              </Button>
            }
          />
          <CardBody>
            {students.length === 0 ? (
              <EmptyState
                icon={<Users size={20} />}
                title={t('common.noData')}
                description={t('plans.emptyStudents')}
                className="border-0 px-2 py-6"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    leadingIcon={<UserPlus size={14} />}
                    onClick={() => setStudentDialog({ open: true })}
                  >
                    {t('plans.addStudent')}
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      className={cn(
                        'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-50',
                        s.id === studentId && 'bg-brand-50 text-brand-900',
                      )}
                    >
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="shrink-0 text-xs text-stone-500">
                        {s.focusAreas.length === 1
                          ? t('plans.areaCount', { n: s.focusAreas.length })
                          : t('plans.areaCount_other', { n: s.focusAreas.length })}
                      </span>
                    </button>
                    <ActionMenu
                      items={[
                        { label: t('common.edit'), icon: <Pencil size={14} />, onClick: () => setStudentDialog({ open: true, student: s }) },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Plans                                                         */}
      {/* ----------------------------------------------------------- */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('plans.searchPh')}
              aria-label={t('plans.searchLabel')}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
          <Button leadingIcon={<Plus size={16} />} onClick={() => setPlanDialog({ open: true })}>
            {t('plans.newPlan')}
          </Button>
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <TagChip active={tag === null} onClick={() => setTag(null)}>
              {t('plans.allAreas')}
            </TagChip>
            {allTags.map((area) => (
              <TagChip key={area} active={tag === area} onClick={() => setTag(tag === area ? null : area)}>
                {area}
              </TagChip>
            ))}
          </div>
        )}

        {student && ranked.length > 0 && (
          <p className="text-sm text-stone-600">
            {t('plans.ranked', { name: student.name })}
          </p>
        )}

        {ranked.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={20} />}
            title={plans.length === 0 ? t('common.noData') : t('plans.noMatch')}
            description={plans.length === 0 ? t('plans.empty') : t('plans.tryFilter')}
            action={
              plans.length === 0 ? (
                <Button leadingIcon={<Plus size={16} />} onClick={() => setPlanDialog({ open: true })}>
                  {t('plans.firstPlan')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {ranked.map((match) => (
              <PlanCard
                key={match.plan.id}
                match={match}
                student={student}
                onOpen={() => setDetail(match.plan)}
                onEdit={() => setPlanDialog({ open: true, plan: match.plan })}
                onDelete={() => setDeleting(match.plan)}
                onToggleAssign={() => void toggleAssign(match)}
              />
            ))}
          </div>
        )}
      </div>

      <LessonPlanDialog
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog((d) => ({ ...d, open }))}
        plan={planDialog.plan}
      />
      <StudentDialog
        open={studentDialog.open}
        onOpenChange={(open) => setStudentDialog((d) => ({ ...d, open }))}
        student={studentDialog.student}
        onDeleted={(id) => {
          if (studentId === id) setStudentId(ALL)
        }}
      />
      <LessonPlanDetail
        plan={detail}
        students={students}
        onClose={() => setDetail(null)}
        onEdit={(plan) => {
          setDetail(null)
          setPlanDialog({ open: true, plan })
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('plans.deleteTitle')}
        description={
          deleting
            ? deleting.imageIds.length === 1
              ? t('plans.deleteBody', { title: deleting.title, n: deleting.imageIds.length })
              : t('plans.deleteBody_other', { title: deleting.title, n: deleting.imageIds.length })
            : undefined
        }
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          await deleteLessonPlanDeep(deleting.id)
          notify(t('plans.deleted'), deleting.title)
        }}
      />
    </div>
  )
}

function TagChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-800',
      )}
    >
      {children}
    </button>
  )
}

interface PlanCardProps {
  match: PlanMatch
  student?: Student
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleAssign: () => void
}

function PlanCard({ match, student, onOpen, onEdit, onDelete, onToggleAssign }: PlanCardProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const { plan, matched, assigned } = match
  const cover = plan.imageIds[0]
  const total = student?.focusAreas.length ?? 0
  return (
    <Card className={cn('flex flex-col overflow-hidden', assigned && student && 'ring-2 ring-brand-300')}>
      <button type="button" onClick={onOpen} className="group text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200">
          {cover ? (
            <MediaImage id={cover} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : (
            <div className="flex size-full items-center justify-center text-brand-500/60">
              <Flower2 size={40} strokeWidth={1.2} />
            </div>
          )}
          {plan.imageIds.length > 1 && (
            <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
              <ImageIcon size={12} /> {plan.imageIds.length}
            </span>
          )}
        </div>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button type="button" onClick={onOpen} className="text-left text-base font-semibold text-stone-900 hover:text-brand-800">
              {plan.title}
            </button>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
              <span>{labels.planLevelLabel[plan.level]}</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {t('common.min', { n: plan.durationMinutes })}
              </span>
            </p>
          </div>
          <ActionMenu
            items={[
              { label: t('plans.view'), icon: <BookOpen size={14} />, onClick: onOpen },
              { label: t('common.edit'), icon: <Pencil size={14} />, onClick: onEdit },
              { label: t('common.delete'), icon: <Trash size={14} />, danger: true, onClick: onDelete },
            ]}
          />
        </div>

        {plan.description && <p className="line-clamp-2 text-sm text-stone-600">{plan.description}</p>}

        <div className="flex flex-wrap gap-1">
          {plan.focusAreas.map((area) => {
            const hit = matched.includes(area)
            return (
              <Badge key={area} tone={hit ? 'brand' : 'neutral'} className={cn(hit && 'bg-brand-600 text-white')}>
                {hit && <Check size={11} />}
                {area}
              </Badge>
            )
          })}
          {plan.focusAreas.length === 0 && <span className="text-xs text-stone-400">{t('plans.noTags')}</span>}
        </div>

        {student && (
          <div className="mt-auto flex flex-col gap-2 border-t border-stone-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className={cn('font-medium', matched.length ? 'text-brand-800' : 'text-stone-500')}>
                {matched.length ? t('plans.covers', { matched: matched.length, total }) : t('plans.noOverlap')}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width]"
                style={{ width: `${total ? (matched.length / total) * 100 : 0}%` }}
              />
            </div>
            <Button
              variant={assigned ? 'secondary' : 'primary'}
              size="sm"
              leadingIcon={assigned ? <Check size={14} /> : undefined}
              onClick={onToggleAssign}
            >
              {assigned
                ? t('plans.assigned', { name: student.name.split(' ')[0] })
                : t('plans.assign', { name: student.name.split(' ')[0] })}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
