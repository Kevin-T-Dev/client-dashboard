import { addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarHeart } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserName } from '@/auth/AuthProvider'
import { AgendaList, type AgendaItem } from '@/components/calendar/AgendaList'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { db } from '@/db/db'
import type { Task } from '@/db/types'
import { dayKey, fmtLongDate, startOfToday, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { Overview } from './Overview'
import { TaskDialog } from '@/pages/yoga/TaskDialog'
import { datedTasks, useTaskAgendaItem } from '@/pages/yoga/taskAgenda'

export function DashboardPage() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const name = useUserName()
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const students = useLiveQuery(() => db.students.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task?: Task }>({ open: false })
  const toTaskItem = useTaskAgendaItem((task) => setTaskDialog({ open: true, task }))

  const horizonEnd = addDays(startOfToday(), 7)

  const studentName = new Map(students.map((s) => [s.id, s.name]))

  const upcoming: AgendaItem[] = (() => {
    const items: AgendaItem[] = []
    for (const s of sessions) {
      const d = new Date(s.start)
      if (d < startOfToday() || d > horizonEnd || s.status === 'cancelled') continue
      items.push({
        id: `s-${s.id}`,
        start: s.start,
        end: s.end,
        title: s.title,
        subtitle: [labels.sessionKindLabel[s.kind], s.studentId ? studentName.get(s.studentId) : null, s.location]
          .filter(Boolean)
          .join(' · '),
        tone: s.status === 'done' ? 'muted' : 'brand',
        badges: (
          <>
            <Badge tone="brand">{t('dashboard.yoga')}</Badge>
            {s.role === 'attending' && <Badge tone="info">{t('role.attending')}</Badge>}
            {s.status === 'tbc' && <Badge tone="pending">{t('sessionStatus.tbc')}</Badge>}
          </>
        ),
      })
    }
    for (const a of appointments) {
      const d = new Date(a.start)
      if (d < startOfToday() || d > horizonEnd || a.status === 'cancelled') continue
      items.push({
        id: `a-${a.id}`,
        start: a.start,
        end: a.end,
        title: a.title,
        subtitle: [a.provider, a.location, labels.categoryLabel[a.category]].filter(Boolean).join(' · '),
        tone: a.status === 'done' ? 'muted' : 'accent',
        badges: (
          <>
            <Badge tone="accent">{t('dashboard.appointment')}</Badge>
            {a.status === 'tbc' && <Badge tone="pending">{t('appointmentStatus.tbc')}</Badge>}
          </>
        ),
      })
    }
    // Open to-dos due this week. Overdue ones are listed under today so they stay in view.
    const today = todayKey()
    const lastDay = dayKey(horizonEnd)
    for (const task of datedTasks(tasks)) {
      if (task.column === 'done' || !task.dueDate || task.dueDate > lastDay) continue
      const item = toTaskItem(task, true)
      const start = `${today}T00:00:00`
      items.push(task.dueDate < today ? { ...item, start, end: start } : item)
    }
    return items.sort((x, y) => x.start.localeCompare(y.start))
  })()

  const now = new Date()
  const hour = now.getHours()
  const greeting = t(hour < 12 ? 'dashboard.morning' : hour < 18 ? 'dashboard.afternoon' : 'dashboard.evening')
  const title = name ? t('dashboard.greetingName', { greeting, name }) : greeting

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={fmtLongDate(now)} title={title} description={t('dashboard.intro')} className="mb-0!" />

      <Overview />

      <Card>
        <CardHeader
          title={t('dashboard.upcoming')}
          description={t('dashboard.upcomingHint')}
        />
        <CardBody>
          {sessions.length === 0 && appointments.length === 0 && tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarHeart size={20} />}
              title={t('common.noData')}
              description={t('dashboard.empty')}
            />
          ) : (
            <AgendaList items={upcoming} emptyMessage={t('dashboard.none')} />
          )}
        </CardBody>
      </Card>

      <TaskDialog
        open={taskDialog.open}
        onOpenChange={(open) => setTaskDialog((d) => ({ ...d, open }))}
        task={taskDialog.task}
      />
    </div>
  )
}
