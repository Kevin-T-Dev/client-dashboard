import { Progress } from '@base-ui/react/progress'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, Minus, Pencil, Plus, Receipt, Search, Store, Trash, TriangleAlert, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/Field'
import { StatTile } from '@/components/ui/StatTile'
import { notify } from '@/components/ui/Toaster'
import { deletePackageDeep, packagesApi } from '@/db/api'
import { db } from '@/db/db'
import type { BeautyPackage } from '@/db/types'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { formatMoney } from '@/lib/money'
import {
  daysUntil,
  packageStatus,
  perSessionPrice,
  sessionsRemaining,
  type PackageStatus,
} from '@/lib/packages'
import { PackageDialog } from './PackageDialog'

type StatusFilter = PackageStatus | 'all'

const statusTone: Record<PackageStatus, BadgeTone> = {
  active: 'success',
  expiring: 'warning',
  completed: 'neutral',
  expired: 'danger',
}
const statusRank: Record<PackageStatus, number> = { expiring: 0, active: 1, completed: 2, expired: 3 }

export function PackageCounter() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('packageStatus.all') },
    { value: 'active', label: labels.packageStatusLabel.active },
    { value: 'expiring', label: labels.packageStatusLabel.expiring },
    { value: 'completed', label: labels.packageStatusLabel.completed },
    { value: 'expired', label: labels.packageStatusLabel.expired },
  ]
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? []
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ open: boolean; pkg?: BeautyPackage }>({ open: false })
  const [deleting, setDeleting] = useState<BeautyPackage | null>(null)

  const withStatus = useMemo(
    () =>
      packages
        .map((p) => ({ pkg: p, status: packageStatus(p) }))
        .sort((a, b) => {
          if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status]
          return (a.pkg.expiresAt ?? '9999').localeCompare(b.pkg.expiresAt ?? '9999')
        }),
    [packages],
  )

  const visible = withStatus.filter(({ pkg, status }) => {
    if (filter !== 'all' && status !== filter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      pkg.name.toLowerCase().includes(q) ||
      pkg.provider.toLowerCase().includes(q) ||
      (pkg.location ?? '').toLowerCase().includes(q) ||
      (pkg.notes ?? '').toLowerCase().includes(q)
    )
  })

  const live = withStatus.filter(({ status }) => status === 'active' || status === 'expiring')
  const remaining = live.reduce((s, { pkg }) => s + sessionsRemaining(pkg), 0)
  const expiringCount = withStatus.filter(({ status }) => status === 'expiring').length
  const invested = useMemo(() => {
    const byCurrency = new Map<string, number>()
    for (const p of packages) byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.totalPrice)
    return [...byCurrency.entries()].map(([c, v]) => formatMoney(v, c)).join(' · ') || formatMoney(0, 'USD')
  }, [packages])
  const providers = useMemo(() => [...new Set(packages.map((p) => p.provider))].sort(), [packages])

  async function useSession(pkg: BeautyPackage) {
    if (sessionsRemaining(pkg) === 0) return
    await packagesApi.update(pkg.id, { sessionsUsed: pkg.sessionsUsed + 1 })
    const left = sessionsRemaining(pkg) - 1
    notify(
      t('packages.usedToast'),
      left === 0 ? t('packages.usedUp', { name: pkg.name, left }) : t('packages.usedBody', { name: pkg.name, left }),
    )
  }

  async function undoSession(pkg: BeautyPackage) {
    if (pkg.sessionsUsed === 0) return
    await packagesApi.update(pkg.id, { sessionsUsed: pkg.sessionsUsed - 1 })
    notify(t('packages.restored'), t('packages.restoredBody', { name: pkg.name, left: sessionsRemaining(pkg) + 1 }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label={t('packages.invested')} value={invested} icon={<Wallet size={18} />} tone="accent" />
        <StatTile
          label={t('packages.active')}
          value={live.length}
          hint={t('packages.onRecord', { n: packages.length })}
          icon={<Receipt size={18} />}
          tone="accent"
        />
        <StatTile label={t('packages.leftToUse')} value={remaining} icon={<CalendarClock size={18} />} />
        <StatTile
          label={t('packages.expiring')}
          value={expiringCount}
          icon={<TriangleAlert size={18} />}
          tone={expiringCount ? 'warning' : 'neutral'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                filter === f.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('packages.searchPh')}
            aria-label={t('packages.searchLabel')}
            className={cn(inputClass, 'pl-9')}
          />
        </div>
        <Button variant="accent" leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true })}>
          {t('packages.add')}
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Receipt size={20} />}
          title={packages.length === 0 ? t('common.noData') : t('packages.noMatch')}
          description={packages.length === 0 ? t('packages.empty') : t('packages.tryFilter')}
          action={
            packages.length === 0 ? (
              <Button variant="accent" leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true })}>
                {t('packages.first')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map(({ pkg, status }) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              status={status}
              onUse={() => void useSession(pkg)}
              onUndo={() => void undoSession(pkg)}
              onEdit={() => setDialog({ open: true, pkg })}
              onDelete={() => setDeleting(pkg)}
            />
          ))}
        </div>
      )}

      <PackageDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        pkg={dialog.pkg}
        knownProviders={providers}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('packages.deleteTitle')}
        description={deleting ? t('packages.deleteBody', { name: deleting.name, provider: deleting.provider }) : undefined}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (!deleting) return
          await deletePackageDeep(deleting.id)
          notify(t('packages.deleted'), deleting.name)
        }}
      />
    </div>
  )
}

interface PackageCardProps {
  pkg: BeautyPackage
  status: PackageStatus
  onUse: () => void
  onUndo: () => void
  onEdit: () => void
  onDelete: () => void
}

function PackageCard({ pkg, status, onUse, onUndo, onEdit, onDelete }: PackageCardProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const left = sessionsRemaining(pkg)
  const days = pkg.expiresAt ? daysUntil(pkg.expiresAt) : null
  const when = days === null ? '' : days === 1 ? t('common.day', { n: days }) : t('common.day_other', { n: days })
  return (
    <Card className={cn('flex flex-col gap-4 p-5', status === 'expired' && 'opacity-75')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-stone-900">{pkg.name}</h3>
            <Badge tone={statusTone[status]}>{labels.packageStatusLabel[status]}</Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
            <Store size={14} className="shrink-0" />
            <span className="truncate">{pkg.provider}</span>
            {pkg.location && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{pkg.location}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{labels.categoryLabel[pkg.category]}</span>
          </p>
        </div>
        <ActionMenu
          items={[
            { label: t('common.edit'), icon: <Pencil size={14} />, onClick: onEdit },
            { label: t('packages.undo'), icon: <Minus size={14} />, onClick: onUndo, disabled: pkg.sessionsUsed === 0 },
            { label: t('common.delete'), icon: <Trash size={14} />, danger: true, onClick: onDelete },
          ]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-lg bg-stone-50 p-3 text-center">
        <div>
          <div className="text-lg font-semibold text-stone-900 tabular-nums">{formatMoney(pkg.totalPrice, pkg.currency)}</div>
          <div className="text-[11px] text-stone-500">{t('packages.price')}</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-stone-900 tabular-nums">{formatMoney(perSessionPrice(pkg), pkg.currency)}</div>
          <div className="text-[11px] text-stone-500">{t('packages.perSession')}</div>
        </div>
        <div>
          <div className={cn('text-lg font-semibold tabular-nums', left === 0 ? 'text-stone-400' : 'text-accent-700')}>{left}</div>
          <div className="text-[11px] text-stone-500">{t('packages.sessionsLeft')}</div>
        </div>
      </div>

      <Progress.Root value={pkg.sessionsUsed} max={Math.max(1, pkg.sessionsTotal)} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <Progress.Label>
            {t('packages.used', { used: pkg.sessionsUsed, total: pkg.sessionsTotal })}
          </Progress.Label>
          <Progress.Value />
        </div>
        <Progress.Track className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <Progress.Indicator
            className={cn('h-full rounded-full transition-[width] duration-300', left === 0 ? 'bg-stone-400' : 'bg-accent-500')}
          />
        </Progress.Track>
      </Progress.Root>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
        <span>{t('packages.signed', { date: fmtDate(pkg.purchasedAt, true) })}</span>
        {pkg.expiresAt ? (
          <span className={cn(status === 'expiring' && 'font-medium text-amber-700', status === 'expired' && 'text-red-600')}>
            {days !== null && days < 0
              ? t('packages.expiredOn', { date: fmtDate(pkg.expiresAt, true) })
              : t('packages.expiresOn', { date: fmtDate(pkg.expiresAt, true), when })}
          </span>
        ) : (
          <span>{t('packages.noExpiry')}</span>
        )}
      </div>

      {pkg.notes && <p className="rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2 text-sm text-stone-600">{pkg.notes}</p>}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button variant="accent" size="sm" leadingIcon={<Minus size={14} />} onClick={onUse} disabled={left === 0}>
          {t('packages.use')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {t('packages.editDetails')}
        </Button>
      </div>
    </Card>
  )
}
