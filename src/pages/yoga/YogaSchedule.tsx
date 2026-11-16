import { startOfMonth } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Plus, Trash, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AgendaList, type AgendaItem } from '@/components/calendar/AgendaList'
import { MonthCalendar, type CalendarEvent } from '@/components/calendar/MonthCalendar'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { notify } from '@/components/ui/Toaster'
import { sessionsApi } from '@/db/api'
import { db } from '@/db/db'
import type { YogaSession } from '@/db/types'
import { dayKey, fmtDayLabel, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { SessionDialog } from './SessionDialog'

export function YogaSchedule() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(todayKey())
  const [dialog, setDialog] = useState<{ open: boolean; session?: YogaSession; day?: string }>({ open: false })
  const [deleting, setDeleting] = useState<YogaSession | null>(null)

  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const students = useLiveQuery(() => db.students.orderBy('name').toArray(), []) ?? []
  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), []) ?? []

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])
  const planTitle = useMemo(() => new Map(plans.map((p) => [p.id, p.title])), [plans])

  const events: CalendarEvent[] = sessions.map((s) => ({
    id: s.id,
    start: s.start,
    end: s.end,
    title: s.title,
    tone: s.status === 'cancelled' ? 'muted' : 'brand',
  }))

  const now = new Date()
  const daySessions = sessions
    .filter((s) => dayKey(s.start) === selectedDay)
    .sort((a, b) => a.start.localeCompare(b.start))
  const upcoming = sessions
    .filter((s) => s.status === 'planned' && new Date(s.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6)

  async function setStatus(s: YogaSession, status: YogaSession['status']) {
    await sessionsApi.update(s.id, { status })
    notify(
      status === 'done' ? t('yoga.markedDone') : status === 'cancelled' ? t('yoga.cancelledToast') : t('yoga.restored'),
      s.title,
    )
  }

  const toItem = (s: YogaSession): AgendaItem => ({
    id: s.id,
    start: s.start,
    end: s.end,
    title: s.title,
    subtitle: [labels.sessionKindLabel[s.kind], s.studentId ? studentName.get(s.studentId) : null, s.location]
      .filter(Boolean)
      .join(' · '),
    tone: s.status === 'cancelled' ? 'muted' : 'brand',
    badges: (
      <>
        {s.status === 'done' && <Badge tone="success">{t('sessionStatus.done')}</Badge>}
        {s.status === 'cancelled' && <Badge tone="neutral">{t('sessionStatus.cancelled')}</Badge>}
        {s.lessonPlanId && planTitle.get(s.lessonPlanId) && (
          <Badge tone="brand">{planTitle.get(s.lessonPlanId)}</Badge>
        )}
      </>
    ),
    onClick: () => setDialog({ open: true, session: s }),
    actions: (
      <ActionMenu
        items={[
          { label: t('common.edit'), icon: <Pencil size={14} />, onClick: () => setDialog({ open: true, session: s }) },
          s.status === 'done'
            ? { label: t('yoga.markPlanned'), icon: <Check size={14} />, onClick: () => void setStatus(s, 'planned') }
            : { label: t('yoga.markDone'), icon: <Check size={14} />, onClick: () => void setStatus(s, 'done') },
          s.status === 'cancelled'
            ? { label: t('yoga.restore'), icon: <XCircle size={14} />, onClick: () => void setStatus(s, 'planned') }
            : { label: t('yoga.cancel'), icon: <XCircle size={14} />, onClick: () => void setStatus(s, 'cancelled') },
          { label: t('yoga.delete'), icon: <Trash size={14} />, danger: true, onClick: () => setDeleting(s) },
        ]}
      />
    ),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-500" /> {t('yoga.plannedDone')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-stone-400" /> {t('yoga.cancelled')}
          </span>
        </div>
        <Button leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, day: selectedDay })}>
          {t('yoga.newSession')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardBody className="pt-5">
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              events={events}
              tone="brand"
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={fmtDayLabel(selectedDay)}
              description={
                daySessions.length === 1
                  ? t('yoga.sessionCount', { n: daySessions.length })
                  : t('yoga.sessionCount_other', { n: daySessions.length })
              }
              actions={
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label={t('yoga.addOnDay')}
                  onClick={() => setDialog({ open: true, day: selectedDay })}
                >
                  <Plus size={16} />
                </Button>
              }
            />
            <CardBody>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={<Plus size={20} />}
                  title={t('common.noData')}
                  description={t('yoga.empty')}
                  action={
                    <Button leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, day: selectedDay })}>
                      {t('yoga.newSession')}
                    </Button>
                  }
                />
              ) : (
                <AgendaList grouped={false} items={daySessions.map(toItem)} emptyMessage={t('yoga.noneToday')} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('yoga.comingUp')} description={t('yoga.comingUpHint')} />
            <CardBody>
              {sessions.length === 0 ? (
                <EmptyState title={t('common.noData')} description={t('yoga.upcomingEmpty')} />
              ) : (
                <AgendaList items={upcoming.map(toItem)} emptyMessage={t('yoga.nothingPlanned')} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <SessionDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        session={dialog.session}
        defaultDay={dialog.day ?? selectedDay}
        students={students}
        plans={plans}
        onDelete={(s) => {
          setDialog({ open: false })
          setDeleting(s)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('yoga.deleteTitle')}
        description={deleting ? t('yoga.deleteBody', { title: deleting.title }) : undefined}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          await sessionsApi.remove(deleting.id)
          notify(t('yoga.deleted'), deleting.title)
        }}
      />
    </div>
  )
}
