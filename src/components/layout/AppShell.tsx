import { CalendarHeart, Flower, Flower2, LayoutDashboard, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { resetAndReseed } from '@/db/seed'
import { cn } from '@/lib/cn'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { notify } from '../ui/Toaster'

const nav = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/yoga', labelKey: 'nav.yoga', icon: Flower2, end: false },
  { to: '/appointments', labelKey: 'nav.appointments', icon: CalendarHeart, end: false },
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-300/60">
        <Flower size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-stone-900">Kelly Dashboard</div>
      </div>
    </div>
  )
}

function NavItems({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const { t, i18n } = useTranslation()
  return (
    <nav
      className={cn(
        'flex gap-1',
        orientation === 'vertical' ? 'flex-col' : 'flex-row overflow-x-auto',
      )}
    >
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-100 text-brand-800'
                : 'text-stone-600 hover:bg-brand-50 hover:text-brand-800',
            )
          }
        >
          <item.icon size={18} />
          {t(item.labelKey)}
        </NavLink>
      ))}
      <div className={cn('flex gap-1', orientation === 'vertical' ? 'mt-4' : 'ml-1')}>
        {(
          [
            ['zh-CN', '中文'],
            ['en', 'EN'],
          ] as const
        ).map(([code, label]) => {
          const active = i18n.language.startsWith('zh') ? code === 'zh-CN' : code === 'en'
          return (
            <button
              key={code}
              type="button"
              onClick={() => void i18n.changeLanguage(code)}
              className={cn(
                'rounded-lg px-2 py-1 text-xs font-medium',
                active ? 'bg-brand-600 text-white' : 'text-stone-500 hover:bg-brand-50 hover:text-brand-800',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const [resetOpen, setResetOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-brand-100 bg-white/80 px-4 py-6 backdrop-blur-md md:flex">
        <Brand />
        <div className="mt-8">
          <NavItems orientation="vertical" />
        </div>
        <div className="mt-auto text-xs text-stone-500">
          {!isSupabaseConfigured() && (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              <RotateCcw size={14} /> Reset sample data
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
          <Brand />
          <div className="mt-3 -mx-1">
            <NavItems orientation="horizontal" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t('shell.resetTitle')}
        description={t('shell.resetBody')}
        confirmLabel={t('shell.reset')}
        destructive
        onConfirm={async () => {
          await resetAndReseed()
          notify(t('shell.restored'))
        }}
      />
    </div>
  )
}
