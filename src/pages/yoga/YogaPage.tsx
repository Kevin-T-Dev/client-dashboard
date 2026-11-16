import { BookOpen, CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionTabs } from '@/components/ui/SectionTabs'

export function YogaPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const current = location.pathname.split('/')[2] || 'schedule'
  const tabs = useMemo(
    () => [
      { value: 'schedule', label: t('yoga.schedule'), icon: <CalendarDays size={16} /> },
      { value: 'plans', label: t('yoga.plans'), icon: <BookOpen size={16} /> },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader title={t('yoga.title')} description={t('yoga.description')} />
      <div className="mb-6">
        <SectionTabs value={current} onValueChange={(v) => navigate(`/yoga/${v}`)} tabs={tabs} />
      </div>
      <div key={current} className="animate-fade-in">
        <Outlet />
      </div>
    </div>
  )
}
