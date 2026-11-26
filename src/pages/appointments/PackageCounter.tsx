import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Pencil, Plus, Receipt, Search, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClass } from '@/components/ui/Field'
import { notify } from '@/components/ui/Toaster'
import { deletePackageDeep, packagesApi } from '@/db/api'
import { db } from '@/db/db'
import type { BeautyPackage } from '@/db/types'
import { cn } from '@/lib/cn'
import { fmtDate } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { formatMoney } from '@/lib/money'
import {
  packageStatus,
  perSessionPrice,
  sessionsRemaining,
  type PackageStatus,
} from '@/lib/packages'
import { PackageDialog } from './PackageDialog'

const emptyPackages: BeautyPackage[] = []

type StatusFilter = PackageStatus | 'all'

const statusTone: Record<PackageStatus, BadgeTone> = {
  active: 'success',
  expiring: 'warning',
  completed: 'neutral',
  expired: 'danger',
  incomplete: 'neutral',
}
const statusRank: Record<PackageStatus, number> = { expiring: 0, active: 1, completed: 2, expired: 3, incomplete: 4 }

export function PackageCounter() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('packageStatus.all') },
    { value: 'active', label: labels.packageStatusLabel.active },
    { value: 'expiring', label: labels.packageStatusLabel.expiring },
    { value: 'completed', label: labels.packageStatusLabel.completed },
    { value: 'expired', label: labels.packageStatusLabel.expired },
    { value: 'incomplete', label: labels.packageStatusLabel.incomplete },
  ]
  const packages = useLiveQuery(() => db.packages.toArray(), []) ?? emptyPackages
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

  const providers = useMemo(() => [...new Set(packages.map((p) => p.provider))].sort(), [packages])

  async function recordSession(pkg: BeautyPackage) {
    if (sessionsRemaining(pkg) === 0) return
    await packagesApi.update(pkg.id, { sessionsUsed: (pkg.sessionsUsed ?? 0) + 1 })
    const left = sessionsRemaining(pkg) - 1
    notify(
      t('packages.usedToast'),
      left === 0 ? t('packages.usedUp', { name: pkg.name, left }) : t('packages.usedBody', { name: pkg.name, left }),
    )
  }

  async function undoSession(pkg: BeautyPackage) {
    if ((pkg.sessionsUsed ?? 0) === 0) return
    await packagesApi.update(pkg.id, { sessionsUsed: (pkg.sessionsUsed ?? 0) - 1 })
    notify(t('packages.restored'), t('packages.restoredBody', { name: pkg.name, left: sessionsRemaining(pkg) + 1 }))
  }

  return (
    <div className="flex flex-col gap-6">
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
        <div className="max-w-full overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table aria-label={t('appointments.packages')} className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs text-stone-600">
              <tr>
                {['appointmentForm.package', 'appointmentForm.store', 'common.status', 'packages.price',
                  'packages.sessionsLeft', 'packageForm.signed', 'packageForm.expires', 'common.moreActions'].map((key) => (
                  <th key={key} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{t(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map(({ pkg, status }) => (
                <PackageRow
                  key={pkg.id}
                  pkg={pkg}
                  status={status}
                  onUse={() => void recordSession(pkg)}
                  onUndo={() => void undoSession(pkg)}
                  onEdit={() => setDialog({ open: true, pkg })}
                  onDelete={() => setDeleting(pkg)}
                />
              ))}
            </tbody>
          </table>
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

interface PackageRowProps {
  pkg: BeautyPackage
  status: PackageStatus
  onUse: () => void
  onUndo: () => void
  onEdit: () => void
  onDelete: () => void
}

function PackageRow({ pkg, status, onUse, onUndo, onEdit, onDelete }: PackageRowProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const left = sessionsRemaining(pkg)
  const knownBalance = pkg.sessionsTotal !== undefined && pkg.sessionsUsed !== undefined
  const { totalPrice, currency } = pkg
  const hasPrice = totalPrice !== undefined && currency !== undefined

  return (
    <tr className="align-top text-stone-700 hover:bg-stone-50/50 [&>td]:px-4 [&>td]:py-3">
      <th scope="row" className="min-w-40 px-4 py-3 font-medium text-stone-900">
        {pkg.name}
        <div className="text-xs font-normal text-stone-500">{labels.categoryLabel[pkg.category]}</div>
        {pkg.notes && <p className="mt-1 whitespace-pre-line break-words text-xs font-normal text-stone-600">{pkg.notes}</p>}
      </th>
      <td>{pkg.provider}{pkg.location && <div className="text-xs text-stone-500">{pkg.location}</div>}</td>
      <td><Badge tone={statusTone[status]}>{labels.packageStatusLabel[status]}</Badge></td>
      <td className="whitespace-nowrap tabular-nums">
        {hasPrice ? formatMoney(totalPrice, currency) : '—'}
        {hasPrice && (pkg.sessionsTotal ?? 0) > 0 && (
          <div className="text-xs text-stone-500">{t('packages.perSession')} · {formatMoney(perSessionPrice(pkg), currency)}</div>
        )}
      </td>
      <td className="whitespace-nowrap tabular-nums">
        {knownBalance ? left : '—'}
        {knownBalance && <div className="text-xs text-stone-500">{t('packages.used', { used: pkg.sessionsUsed, total: pkg.sessionsTotal })}</div>}
      </td>
      <td className="whitespace-nowrap">{pkg.purchasedAt ? fmtDate(pkg.purchasedAt, true) : '—'}</td>
      <td className="whitespace-nowrap">{pkg.expiresAt ? fmtDate(pkg.expiresAt, true) : t('packages.noExpiry')}</td>
      <td>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Button variant="accent" size="sm" onClick={onUse} disabled={left === 0}>{t('packages.use')}</Button>
          <ActionMenu items={[
            { label: t('common.edit'), icon: <Pencil size={14} />, onClick: onEdit },
            { label: t('packages.undo'), icon: <Minus size={14} />, onClick: onUndo, disabled: (pkg.sessionsUsed ?? 0) === 0 },
            { label: t('common.delete'), icon: <Trash size={14} />, danger: true, onClick: onDelete },
          ]} />
        </div>
      </td>
    </tr>
  )
}
