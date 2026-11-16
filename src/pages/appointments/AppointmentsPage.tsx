import { CalendarDays, Receipt } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionTabs } from '@/components/ui/SectionTabs'

export function AppointmentsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const current = location.pathname.split('/')[2] || 'schedule'
  const tabs = useMemo(
    () => [
      { value: 'schedule', label: t('appointments.schedule'), icon: <CalendarDays size={16} /> },
      { value: 'packages', label: t('appointments.packages'), icon: <Receipt size={16} /> },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader title={t('appointments.title')} description={t('appointments.description')} />
      <div className="mb-6">
        <SectionTabs value={current} onValueChange={(v) => navigate(`/appointments/${v}`)} tabs={tabs} />
      </div>
      <div key={current} className="animate-fade-in">
        <Outlet />
      </div>
    </div>
  )
}
