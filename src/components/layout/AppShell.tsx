import { CalendarHeart, Flower2, LayoutDashboard, ListTodo, LogOut, RotateCcw, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth, useUserName } from '@/auth/AuthProvider'
import { resetAndReseed } from '@/db/seed'
import { cn } from '@/lib/cn'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { notify } from '../ui/Toaster'
import { Brand } from './Brand'
import { LanguageSwitch } from './LanguageSwitch'

const nav = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', labelKey: 'nav.tasks', icon: ListTodo, end: false },
  { to: '/yoga', labelKey: 'nav.yoga', icon: Flower2, end: false },
  { to: '/appointments', labelKey: 'nav.appointments', icon: CalendarHeart, end: false },
]

/** Sidebar navigation for tablet and desktop. */
function NavItems() {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-1">
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
      <LanguageSwitch className="mt-4 self-start" />
    </nav>
  )
}

/** Phone navigation: a bottom tab bar within thumb reach, clear of the home indicator. */
function TabBar() {
  const { t } = useTranslation()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-8px_rgb(214_61_134/0.18)] backdrop-blur-md md:hidden"
    >
      <div className="grid grid-cols-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 pt-1.5 pb-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500',
                isActive ? 'text-brand-700' : 'text-stone-500 active:text-brand-700',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-brand-100',
                  )}
                >
                  <item.icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                </span>
                <span className="max-w-full truncate">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** Who is signed in, with sign-out. Shown in the sidebar when Supabase is configured. */
function UserPanel() {
  const { t } = useTranslation()
  const auth = useAuth()
  const name = useUserName()
  return (
    <div className="rounded-xl border border-brand-100 bg-white/70 p-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <UserRound size={16} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium text-stone-900">{name || auth.user?.email}</div>
          <div className="truncate text-xs text-stone-500">{auth.user?.email}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void auth.signOut()}
        className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
      >
        <LogOut size={14} /> {t('auth.signOut')}
      </button>
    </div>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [resetOpen, setResetOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-brand-100 bg-white/80 px-4 py-6 backdrop-blur-md md:flex">
        <Brand />
        <div className="mt-8">
          <NavItems />
        </div>
        <div className="mt-auto text-xs text-stone-500">
          {auth.configured ? (
            <UserPanel />
          ) : (
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

      {/* Clip sideways overflow so a wide child can never make the page (and the tab bar) drag sideways on phones. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Brand />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <LanguageSwitch />
              {auth.configured && (
                <button
                  type="button"
                  onClick={() => void auth.signOut()}
                  aria-label={t('auth.signOut')}
                  title={t('auth.signOut')}
                  className="flex size-11 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8">
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <TabBar />

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
