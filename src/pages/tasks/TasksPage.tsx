import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import { YogaKanban } from '@/pages/yoga/YogaKanban'

export function TasksPage() {
  const { t } = useTranslation()
  return (
    <div>
      <PageHeader title={t('tasksPage.title')} description={t('tasksPage.description')} />
      <YogaKanban />
    </div>
  )
}
