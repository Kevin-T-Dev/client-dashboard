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
    <div className={cn('flex shrink-0 gap-0.5 rounded-xl bg-brand-50 p-0.5', className)}>
      {languages.map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => void i18n.changeLanguage(code)}
          className={cn(
            'min-h-9 min-w-10 rounded-[10px] px-2 text-xs font-medium whitespace-nowrap transition-colors md:min-h-7',
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
