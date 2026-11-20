import { startOfMonth } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarCheck, Check, ListTodo, Pencil, Plus, Trash, XCircle } from 'lucide-react'
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
import { appointmentsApi, packagesApi } from '@/db/api'
import { db } from '@/db/db'
import type { Appointment, Task } from '@/db/types'
import { dayKey, fmtDayLabel, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { sessionsRemaining } from '@/lib/packages'
import { TaskDialog } from '@/pages/yoga/TaskDialog'
import { datedTasks, taskToEvent, useTaskAgendaItem } from '@/pages/yoga/taskAgenda'
import { AppointmentDialog } from './AppointmentDialog'

export function AppointmentSchedule() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(todayKey())
  const [dialog, setDialog] = useState<{ open: boolean; appointment?: Appointment; day?: string }>({ open: false })
  const [deleting, setDeleting] = useState<Appointment | null>(null)
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task?: Task; day?: string }>({ open: false })

  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? []
  const packageById = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages])
  const tasks = datedTasks(useLiveQuery(() => db.tasks.toArray(), []) ?? [], 'appointments')
  const toTaskItem = useTaskAgendaItem((task) => setTaskDialog({ open: true, task }))

  const events: CalendarEvent[] = [
    ...appointments.map((a) => ({
      id: a.id,
      start: a.start,
      end: a.end,
      title: `${a.title} · ${a.provider}`,
      tone: a.status === 'cancelled' ? ('muted' as const) : a.status === 'tbc' ? ('pending' as const) : ('accent' as const),
    })),
    ...tasks.map(taskToEvent),
  ]

  const now = new Date()
  const dayItems = appointments
    .filter((a) => dayKey(a.start) === selectedDay)
    .sort((a, b) => a.start.localeCompare(b.start))
  const dayTasks = tasks.filter((task) => task.dueDate === selectedDay)
  const upcoming = appointments
    .filter((a) => (a.status === 'upcoming' || a.status === 'tbc') && new Date(a.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6)

  /** Marks an appointment done and, when linked to a package, uses up one session. */
  async function markDone(a: Appointment) {
    let deductedFrom: string | null = null
    await db.transaction('rw', [db.appointments, db.packages], async () => {
      await appointmentsApi.update(a.id, { status: 'done' })
      if (a.packageId) {
        const pkg = await db.packages.get(a.packageId)
        if (pkg && sessionsRemaining(pkg) > 0) {
          await packagesApi.update(pkg.id, { sessionsUsed: pkg.sessionsUsed + 1 })
          deductedFrom = pkg.name
        }
      }
    })
    notify(t('appointments.done'), deductedFrom ? t('appointments.deducted', { name: deductedFrom }) : a.title)
  }

  /** Reverts a done appointment and gives the package session back. */
  async function markUpcoming(a: Appointment) {
    await db.transaction('rw', [db.appointments, db.packages], async () => {
      await appointmentsApi.update(a.id, { status: 'upcoming' })
      if (a.status === 'done' && a.packageId) {
        const pkg = await db.packages.get(a.packageId)
        if (pkg && pkg.sessionsUsed > 0) await packagesApi.update(pkg.id, { sessionsUsed: pkg.sessionsUsed - 1 })
      }
    })
    notify(t('appointments.back'), a.title)
  }

  async function confirm(a: Appointment) {
    await appointmentsApi.update(a.id, { status: 'upcoming' })
    notify(t('appointments.confirmed'), a.title)
  }

  async function cancel(a: Appointment) {
    await appointmentsApi.update(a.id, { status: 'cancelled' })
    notify(t('appointments.cancelledToast'), a.title)
  }

  const toItem = (a: Appointment): AgendaItem => {
    const pkg = a.packageId ? packageById.get(a.packageId) : undefined
    return {
      id: a.id,
      start: a.start,
      end: a.end,
      title: a.title,
      subtitle: [a.provider, a.location, labels.categoryLabel[a.category]].filter(Boolean).join(' · '),
      tone: a.status === 'cancelled' ? 'muted' : a.status === 'tbc' ? 'pending' : 'accent',
      badges: (
        <>
          {a.status === 'tbc' && <Badge tone="pending">{t('appointmentStatus.tbc')}</Badge>}
          {a.status === 'done' && <Badge tone="success">{t('appointments.doneBadge')}</Badge>}
          {a.status === 'cancelled' && <Badge tone="neutral">{t('appointments.cancelledBadge')}</Badge>}
          {pkg && (
            <Badge tone="accent">
              {pkg.name} · {t('common.left', { n: sessionsRemaining(pkg) })}
            </Badge>
          )}
        </>
      ),
      onClick: () => setDialog({ open: true, appointment: a }),
      actions: (
        <ActionMenu
          items={[
            { label: t('common.edit'), icon: <Pencil size={14} />, onClick: () => setDialog({ open: true, appointment: a }) },
            ...(a.status === 'tbc'
              ? [{ label: t('appointments.markConfirmed'), icon: <CalendarCheck size={14} />, onClick: () => void confirm(a) }]
              : []),
            a.status === 'done'
              ? { label: t('appointments.markUpcoming'), icon: <Check size={14} />, onClick: () => void markUpcoming(a) }
              : { label: t('appointments.markDone'), icon: <Check size={14} />, onClick: () => void markDone(a) },
            a.status === 'cancelled'
              ? { label: t('common.restore'), icon: <XCircle size={14} />, onClick: () => void markUpcoming(a) }
              : { label: t('appointments.cancel'), icon: <XCircle size={14} />, onClick: () => void cancel(a) },
            { label: t('common.delete'), icon: <Trash size={14} />, danger: true, onClick: () => setDeleting(a) },
          ]}
        />
      ),
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-accent-500" /> {t('appointments.bookedDone')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-stone-400" /> {t('appointments.cancelled')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-500" /> {t('appointmentStatus.tbc')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" /> {t('task.legend')}
          </span>
        </div>
        <Button
          variant="accent"
          leadingIcon={<Plus size={16} />}
          onClick={() => setDialog({ open: true, day: selectedDay })}
        >
          {t('appointments.new')}
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardBody className="pt-5">
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              events={events}
              tone="accent"
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={fmtDayLabel(selectedDay)}
              description={[
                dayItems.length === 1
                  ? t('appointments.count', { n: dayItems.length })
                  : t('appointments.count_other', { n: dayItems.length }),
                dayTasks.length === 1
                  ? t('task.count', { n: dayTasks.length })
                  : t('task.count_other', { n: dayTasks.length }),
              ].join(' · ')}
              actions={
                <div className="flex gap-1">
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    aria-label={t('task.addOnDay')}
                    title={t('task.addOnDay')}
                    onClick={() => setTaskDialog({ open: true, day: selectedDay })}
                  >
                    <ListTodo size={16} />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    aria-label={t('appointments.addOnDay')}
                    title={t('appointments.addOnDay')}
                    onClick={() => setDialog({ open: true, day: selectedDay })}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              }
            />
            <CardBody>
              {appointments.length === 0 && tasks.length === 0 ? (
                <EmptyState
                  icon={<Plus size={20} />}
                  title={t('common.noData')}
                  description={t('appointments.empty')}
                  action={
                    <Button
                      variant="accent"
                      leadingIcon={<Plus size={16} />}
                      onClick={() => setDialog({ open: true, day: selectedDay })}
                    >
                      {t('appointments.new')}
                    </Button>
                  }
                />
              ) : (
                <AgendaList
                  grouped={false}
                  items={[...dayTasks.map((task) => toTaskItem(task)), ...dayItems.map(toItem)]}
                  emptyMessage={t('appointments.noneToday')}
                />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('appointments.comingUp')} description={t('appointments.comingUpHint')} />
            <CardBody>
              {appointments.length === 0 ? (
                <EmptyState title={t('common.noData')} description={t('appointments.upcomingEmpty')} />
              ) : (
                <AgendaList items={upcoming.map(toItem)} emptyMessage={t('appointments.nothingBooked')} />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <AppointmentDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        appointment={dialog.appointment}
        defaultDay={dialog.day ?? selectedDay}
        packages={packages}
        onDelete={(a) => {
          setDialog({ open: false })
          setDeleting(a)
        }}
      />

      <TaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((d) => ({ ...d, open }))}
        task={taskDialog.task}
        defaultDueDate={taskDialog.day ?? selectedDay}
        defaultArea="appointments"
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('appointments.deleteTitle')}
        description={deleting ? t('appointments.deleteBody', { title: deleting.title, provider: deleting.provider }) : undefined}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          await appointmentsApi.remove(deleting.id)
          notify(t('appointments.deleted'), deleting.title)
        }}
      />
    </div>
  )
}
