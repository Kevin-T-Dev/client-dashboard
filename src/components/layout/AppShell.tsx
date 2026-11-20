import {
  CalendarHeart,
  Flower2,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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

const SIDEBAR_KEY = 'sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

/** Sidebar navigation for tablet and desktop. Collapsed, it shows icons only with the label as a tooltip. */
function NavItems({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  return (
    <nav className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={collapsed ? t(item.labelKey) : undefined}
          className={({ isActive }) =>
            cn(
              'flex shrink-0 items-center gap-3 rounded-xl text-sm font-medium transition-colors',
              collapsed ? 'size-10 justify-center' : 'px-3 py-2',
              isActive
                ? 'bg-brand-100 text-brand-800'
                : 'text-stone-600 hover:bg-brand-50 hover:text-brand-800',
            )
          }
        >
          <item.icon size={18} className="shrink-0" />
          <span className={cn(collapsed && 'sr-only')}>{t(item.labelKey)}</span>
        </NavLink>
      ))}
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
function UserPanel({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const name = useUserName()
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          title={name || auth.user?.email}
          className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-brand-700"
        >
          <UserRound size={16} />
        </div>
        <button
          type="button"
          onClick={() => void auth.signOut()}
          aria-label={t('auth.signOut')}
          title={t('auth.signOut')}
          className="flex size-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <LogOut size={16} />
        </button>
      </div>
    )
  }
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
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const location = useLocation()

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for this visit.
    }
  }, [collapsed])

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-brand-100 bg-white/80 py-6 backdrop-blur-md transition-[width] duration-200 ease-out md:flex',
          collapsed ? 'w-[4.5rem] px-3' : 'w-60 px-4',
        )}
      >
        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
          <Brand compact={collapsed} />
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
            aria-expanded={!collapsed}
            title={collapsed ? t('shell.expand') : t('shell.collapse')}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="mt-8">
          <NavItems collapsed={collapsed} />
        </div>
        <div className={cn('mt-auto text-xs text-stone-500', collapsed && 'flex justify-center')}>
          {auth.configured ? (
            <UserPanel collapsed={collapsed} />
          ) : (
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              title={collapsed ? 'Reset sample data' : undefined}
              aria-label={collapsed ? 'Reset sample data' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-800',
                collapsed ? 'size-9 justify-center' : 'px-2 py-1.5',
              )}
            >
              <RotateCcw size={14} /> {!collapsed && 'Reset sample data'}
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
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:py-8">
          {/* Desktop language switch, top right of the page; phones have it in the header. */}
          <LanguageSwitch className="absolute top-8 right-8 z-10 hidden md:flex" />
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
