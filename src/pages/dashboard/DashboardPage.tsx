import { addDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarHeart } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AgendaList, type AgendaItem } from '@/components/calendar/AgendaList'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { db } from '@/db/db'
import { startOfToday } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { YogaKanban } from '@/pages/yoga/YogaKanban'

export function DashboardPage() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const appointments = useLiveQuery(() => db.appointments.toArray(), []) ?? []
  const students = useLiveQuery(() => db.students.toArray(), []) ?? []

  const horizonEnd = addDays(startOfToday(), 7)

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students])

  const upcoming: AgendaItem[] = useMemo(() => {
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
        badges: <Badge tone="brand">{t('dashboard.yoga')}</Badge>,
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
        badges: <Badge tone="accent">{t('dashboard.appointment')}</Badge>,
      })
    }
    return items.sort((x, y) => x.start.localeCompare(y.start))
  }, [sessions, appointments, studentName, horizonEnd, labels, t])

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader
          title={t('dashboard.upcoming')}
          description={t('dashboard.upcomingHint')}
        />
        <CardBody className="h-80 overflow-y-auto">
          {sessions.length === 0 && appointments.length === 0 ? (
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

      <YogaKanban />
    </div>
  )
}
