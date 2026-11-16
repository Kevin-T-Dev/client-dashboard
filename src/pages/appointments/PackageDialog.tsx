import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { packagesApi } from '@/db/api'
import type { AppointmentCategory, BeautyPackage } from '@/db/types'
import { todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { CURRENCIES } from '@/lib/money'

export interface PackageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pkg?: BeautyPackage
  knownProviders: string[]
}

const currencyItems = CURRENCIES.map((c) => ({ value: c, label: c }))

export function PackageDialog(props: PackageDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, pkg } = props
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={pkg ? t('packageForm.edit') : t('packageForm.new')}
      description={t('packageForm.intro')}
      size="lg"
    >
      <PackageForm key={pkg?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function PackageForm({ onOpenChange, pkg, knownProviders }: PackageDialogProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [name, setName] = useState(pkg?.name ?? '')
  const [provider, setProvider] = useState(pkg?.provider ?? '')
  const [location, setLocation] = useState(pkg?.location ?? '')
  const [category, setCategory] = useState<AppointmentCategory>(pkg?.category ?? 'facial')
  const [totalPrice, setTotalPrice] = useState(pkg ? String(pkg.totalPrice) : '')
  const [currency, setCurrency] = useState<string>(pkg?.currency ?? 'USD')
  const [sessionsTotal, setSessionsTotal] = useState(pkg ? String(pkg.sessionsTotal) : '10')
  const [sessionsUsed, setSessionsUsed] = useState(pkg ? String(pkg.sessionsUsed) : '0')
  const [purchasedAt, setPurchasedAt] = useState(pkg?.purchasedAt ?? todayKey())
  const [expiresAt, setExpiresAt] = useState(pkg?.expiresAt ?? '')
  const [notes, setNotes] = useState(pkg?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const listId = useId()

  const price = Number(totalPrice)
  const total = Number(sessionsTotal)
  const perSession = price > 0 && total > 0 ? price / total : null

  async function save() {
    if (!name.trim()) return setError(t('packageForm.needName'))
    if (!provider.trim()) return setError(t('appointmentForm.needStore'))
    if (!(price >= 0)) return setError(t('packageForm.needPrice'))
    if (!(total >= 1)) return setError(t('packageForm.needSessions'))
    const used = Math.min(Math.max(0, Number(sessionsUsed) || 0), total)
    if (!purchasedAt) return setError(t('packageForm.needDate'))
    setError(null)
    const data = {
      name: name.trim(),
      provider: provider.trim(),
      location: location.trim() || undefined,
      category,
      totalPrice: price,
      currency,
      sessionsTotal: total,
      sessionsUsed: used,
      purchasedAt,
      expiresAt: expiresAt || undefined,
      notes: notes.trim() || undefined,
    }
    if (pkg) {
      await packagesApi.update(pkg.id, data)
      notify(t('packageForm.updated'), data.name)
    } else {
      await packagesApi.create(data)
      notify(t('packageForm.added'), t('packageForm.addedBody', { name: data.name, provider: data.provider }))
    }
    onOpenChange(false)
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('packageForm.name')} className="sm:col-span-2">
          <TextInput value={name} onValueChange={setName} placeholder={t('packageForm.namePh')} autoFocus />
        </FormField>
        <FormField label={t('appointmentForm.store')}>
          <TextInput value={provider} onValueChange={setProvider} placeholder={t('appointmentForm.storePh')} list={listId} />
          <datalist id={listId}>
            {knownProviders.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </FormField>
        <FormField label={t('common.category')}>
          <AppSelect value={category} onValueChange={setCategory} items={labels.categories} tone="accent" />
        </FormField>
        <FormField label={t('common.location')} hint={t('appointmentForm.locationHint')} className="sm:col-span-2">
          <TextInput value={location} onValueChange={setLocation} placeholder={t('appointmentForm.locationPh')} />
        </FormField>
        <FormField label={t('packageForm.total')}>
          <TextInput type="number" min={0} step="0.01" inputMode="decimal" value={totalPrice} onValueChange={setTotalPrice} placeholder="0.00" />
        </FormField>
        <FormField label={t('packageForm.currency')}>
          <AppSelect value={currency} onValueChange={setCurrency} items={currencyItems} tone="accent" />
        </FormField>
        <FormField
          label={t('packageForm.included')}
          hint={perSession ? t('packageForm.per', { amount: perSession.toFixed(2), currency }) : undefined}
        >
          <TextInput type="number" min={1} step={1} value={sessionsTotal} onValueChange={setSessionsTotal} />
        </FormField>
        <FormField label={t('packageForm.used')}>
          <TextInput type="number" min={0} step={1} value={sessionsUsed} onValueChange={setSessionsUsed} />
        </FormField>
        <FormField label={t('packageForm.signed')}>
          <TextInput type="date" value={purchasedAt} onValueChange={setPurchasedAt} required />
        </FormField>
        <FormField label={t('packageForm.expires')} hint={t('packageForm.expiresHint')}>
          <TextInput type="date" value={expiresAt} onValueChange={setExpiresAt} />
        </FormField>
      </div>
      <FormField label={t('common.notes')} hint={t('packageForm.notesHint')}>
        <TextArea value={notes} onValueChange={setNotes} />
      </FormField>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="accent">
          {pkg ? t('common.save') : t('packageForm.add')}
        </Button>
      </div>
    </form>
  )
}
