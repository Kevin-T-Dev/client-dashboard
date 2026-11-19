import { Flower } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUserName } from '@/auth/AuthProvider'

/** App mark and title. Signed in, the title carries the user's name from their profile. */
export function Brand() {
  const { t } = useTranslation()
  const name = useUserName()
  const title = name ? t('brand.named', { name }) : t('brand.title')

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-300/60">
        <Flower size={18} />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-stone-900">{title}</div>
      </div>
    </div>
  )
}
