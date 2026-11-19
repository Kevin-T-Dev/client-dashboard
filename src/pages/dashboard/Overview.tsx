import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, CalendarHeart, Flower2, ListTodo, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { db } from '@/db/db'
import { cn } from '@/lib/cn'
import { fmtDayLabel, fmtTime, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { packageStatus, sessionsRemaining } from '@/lib/packages'
import { AppointmentDialog } from '@/pages/appointments/AppointmentDialog'
import { SessionDialog } from '@/pages/yoga/SessionDialog'
import { TaskDialog } from '@/pages/yoga/TaskDialog'
import { taskArea } from '@/pages/yoga/taskAgenda'

interface StatProps {
  label: string
  value: number
  /** Makes the stat a link, e.g. to the filtered task board. */
  to?: string
  /** Highlights a count that needs attention, such as overdue tasks. */
  alert?: boolean
}

function Stat({ label, value, to, alert }: StatProps) {
  const body = (
    <>
      <p className="line-clamp-2 text-xs leading-tight font-medium text-stone-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold sm:mt-1 sm:text-2xl tracking-tight tabular-nums',
          alert && value > 0 ? 'text-red-600' : 'text-stone-900',
        )}
      >
        {value}
      </p>
    </>
  )
  const tile = cn(
    'flex min-w-0 flex-col justify-between rounded-xl border px-2.5 py-2 sm:px-3 sm:py-2.5 xl:px-2.5',
    alert && value > 0 ? 'border-red-100 bg-red-50/70' : 'border-brand-100/70 bg-white/70',
  )
  if (!to) return <div className={tile}>{body}</div>
  return (
    <Link
      to={to}
      className={cn(
        tile,
        'transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-brand-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-500',
      )}
    >
      {body}
    </Link>
  )
}

interface OverviewCardProps {
  title: string
  icon: ReactNode
  tone: 'brand' | 'accent' | 'task'
  to: string
  /** Up to three stats, laid out in even columns so the cards line up. */
  stats: ReactNode
  /** One line under the stats, e.g. what comes next. */
  footnote: string
  createLabel: string
  onCreate: () => void
}

function OverviewCard({ title, icon, tone, to, stats, footnote, createLabel, onCreate }: OverviewCardProps) {
  const { t } = useTranslation()
  return (
    <Card className="relative isolate flex flex-col gap-3.5 overflow-hidden p-4 transition-shadow sm:gap-4 sm:p-5 duration-300 hover:shadow-md hover:shadow-brand-200/60">
      {/* Decorative tinted band and soft glow behind the card header. */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 -z-10 h-28 bg-gradient-to-b to-transparent',
          tone === 'brand' && 'from-brand-100/80',
          tone === 'accent' && 'from-accent-100/80',
          tone === 'task' && 'from-amber-100/70',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'absolute -top-12 -right-12 -z-10 size-40 rounded-full blur-2xl',
          tone === 'brand' && 'bg-brand-200/60',
          tone === 'accent' && 'bg-accent-200/60',
          tone === 'task' && 'bg-amber-200/50',
        )}
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          tone === 'brand' && 'from-brand-400 to-brand-600',
          tone === 'accent' && 'from-accent-400 to-accent-600',
          tone === 'task' && 'from-amber-300 to-amber-500',
        )}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-4',
              tone === 'brand' && 'from-brand-400 to-brand-600 ring-brand-100',
              tone === 'accent' && 'from-accent-400 to-accent-600 ring-accent-100',
              tone === 'task' && 'from-amber-400 to-amber-500 ring-amber-100',
            )}
          >
            {icon}
          </div>
          <h3 className="truncate text-base font-semibold text-stone-900">{title}</h3>
        </div>
        <Link
          to={to}
          className="group -my-1.5 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-white/70 px-3 text-xs font-medium text-stone-600 ring-1 ring-stone-200/70 transition-colors hover:text-brand-700 hover:ring-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          {t('overview.viewAll')}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2.5">{stats}</div>
      <p className="-mt-1 flex-1 truncate text-xs text-stone-500">{footnote}</p>
      <Button
        variant="primary"
        leadingIcon={<Plus size={16} />}
        onClick={onCreate}
        className="h-11 w-full bg-gradient-to-r text-[15px] sm:h-10 sm:text-sm from-brand-500 to-brand-600 shadow-brand-300/50 hover:from-brand-600 hover:to-brand-700 hover:shadow-md"
      >
        {createLabel}
      </Button>
    </Card>
  )
}

/** Counts for each area of the app, with a shortcut to add a task, session or appointment. */
export function Overview() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const students = useLiveQuery(() => db.students.orderBy('name').toArray(), []) ?? []
  const plans = useLiveQuery(() => db.lessonPlans.orderBy('title').toArray(), []) ?? []
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? []
  const [sessionOpen, setSessionOpen] = useState(false)
  const [appointmentOpen, setAppointmentOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)

  const now = new Date()
  const today = todayKey()
  const when = (iso: string) => `${fmtDayLabel(iso)}, ${fmtTime(iso)}`

  const openTasks = tasks.filter((task) => task.column !== 'done')
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today).length
  const nextDue = openTasks
    .filter((task) => task.dueDate && task.dueDate >= today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0]

  const upcomingSessions = sessions
    .filter((s) => s.status === 'planned' && new Date(s.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
  const attending = upcomingSessions.filter((s) => s.role === 'attending').length
  const nextSession = upcomingSessions[0]

  const upcomingAppointments = appointments
    .filter((a) => a.status === 'upcoming' && new Date(a.end) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
  // Packages that can still be booked: sessions left and not past their expiry date.
  const usablePackages = packages.filter((p) => ['active', 'expiring'].includes(packageStatus(p, today)))
  const sessionsLeft = usablePackages.reduce((sum, p) => sum + sessionsRemaining(p), 0)

  return (
    <section aria-label={t('overview.title')} className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
      <OverviewCard
        title={t('nav.tasks')}
        icon={<ListTodo size={18} />}
        tone="task"
        to="/tasks"
        stats={
          <>
            <Stat
              label={labels.columnTitle.todo}
              value={openTasks.filter((task) => task.column === 'todo').length}
              to="/tasks"
            />
            <Stat
              label={labels.columnTitle.doing}
              value={openTasks.filter((task) => task.column === 'doing').length}
              to="/tasks"
            />
            <Stat label={t('overview.overdue')} value={overdueTasks} to="/tasks" alert />
          </>
        }
        footnote={
          nextDue?.dueDate
            ? t('overview.nextDue', { when: fmtDayLabel(nextDue.dueDate), title: nextDue.title })
            : t('overview.nothingDue')
        }
        createLabel={t('task.new')}
        onCreate={() => setTaskOpen(true)}
      />
      <OverviewCard
        title={t('dashboard.yoga')}
        icon={<Flower2 size={18} />}
        tone="brand"
        to="/yoga/schedule"
        stats={
          <>
            <Stat label={t('role.teaching')} value={upcomingSessions.length - attending} to="/yoga/schedule" />
            <Stat label={t('role.attending')} value={attending} to="/yoga/schedule" />
            <Stat
              label={t('overview.openTasks')}
              value={openTasks.filter((task) => taskArea(task) === 'yoga').length}
              to="/tasks?area=yoga"
            />
          </>
        }
        footnote={
          nextSession
            ? t('overview.next', {
                when: `${when(nextSession.start)} · ${t(`role.${nextSession.role ?? 'teaching'}`)}`,
              })
            : t('overview.nothingNext')
        }
        createLabel={t('yoga.newSession')}
        onCreate={() => setSessionOpen(true)}
      />
      <OverviewCard
        title={t('nav.appointments')}
        icon={<CalendarHeart size={18} />}
        tone="accent"
        to="/appointments/schedule"
        stats={
          <>
            <Stat label={t('overview.upcoming')} value={upcomingAppointments.length} to="/appointments/schedule" />
            <Stat label={t('overview.packages')} value={usablePackages.length} to="/appointments/packages" />
            <Stat label={t('overview.sessionsLeft')} value={sessionsLeft} to="/appointments/packages" />
          </>
        }
        footnote={
          upcomingAppointments[0]
            ? t('overview.next', { when: when(upcomingAppointments[0].start) })
            : t('overview.nothingNext')
        }
        createLabel={t('appointments.new')}
        onCreate={() => setAppointmentOpen(true)}
      />

      <TaskDialog open={taskOpen} onOpenChange={setTaskOpen} defaultColumn="todo" />
      <SessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        defaultDay={todayKey()}
        students={students}
        plans={plans}
      />
      <AppointmentDialog
        open={appointmentOpen}
        onOpenChange={setAppointmentOpen}
        defaultDay={todayKey()}
        packages={packages}
        knownProviders={[
          ...new Set([...appointments.map((a) => a.provider), ...packages.map((p) => p.provider)]),
        ].sort()}
      />
    </section>
  )
}
