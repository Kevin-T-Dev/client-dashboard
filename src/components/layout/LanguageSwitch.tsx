import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

const languages = [
  ['zh-CN', '中文'],
  ['en', 'EN'],
] as const

export function LanguageSwitch({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('zh') ? 'zh-CN' : 'en'
  return (
    <div className={cn('flex gap-1', className)}>
      {languages.map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => void i18n.changeLanguage(code)}
          className={cn(
            'rounded-lg px-2 py-1 text-xs font-medium',
            current === code
              ? 'bg-brand-600 text-white'
              : 'text-stone-500 hover:bg-brand-50 hover:text-brand-800',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
