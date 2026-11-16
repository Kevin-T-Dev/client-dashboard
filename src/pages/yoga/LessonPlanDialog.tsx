import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { AppSelect } from '@/components/ui/Select'
import { TagInput } from '@/components/ui/TagInput'
import { notify } from '@/components/ui/Toaster'
import { lessonPlansApi } from '@/db/api'
import { db } from '@/db/db'
import type { LessonPlan, PlanLevel } from '@/db/types'
import { useAppLabels } from '@/lib/labels'

export interface LessonPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: LessonPlan
}

export function LessonPlanDialog(props: LessonPlanDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, plan } = props
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? t('planForm.edit') : t('planForm.new')}
      description={t('planForm.intro')}
      size="lg"
    >
      <PlanForm key={plan?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function PlanForm({ onOpenChange, plan }: LessonPlanDialogProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [title, setTitle] = useState(plan?.title ?? '')
  const [level, setLevel] = useState<PlanLevel>(plan?.level ?? 'all-levels')
  const [duration, setDuration] = useState(String(plan?.durationMinutes ?? 60))
  const [focusAreas, setFocusAreas] = useState<string[]>(plan?.focusAreas ?? [])
  const [description, setDescription] = useState(plan?.description ?? '')
  const [imageIds, setImageIds] = useState<string[]>(plan?.imageIds ?? [])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef(false)
  const original = useRef(new Set(plan?.imageIds ?? []))

  /** Images uploaded in this dialog but never saved are removed on cancel. */
  async function discardUnsaved() {
    if (savedRef.current) return
    const orphans = imageIds.filter((id) => !original.current.has(id))
    if (orphans.length) await db.media.bulkDelete(orphans)
  }

  function cancel() {
    void discardUnsaved()
    onOpenChange(false)
  }

  async function save() {
    if (!title.trim()) return setError(t('planForm.needTitle'))
    setError(null)
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        level,
        durationMinutes: Math.max(5, Number(duration) || 60),
        focusAreas,
        description: description.trim() || undefined,
        imageIds,
      }
      if (plan) {
        const removed = plan.imageIds.filter((id) => !imageIds.includes(id))
        if (removed.length) await db.media.bulkDelete(removed)
        await lessonPlansApi.update(plan.id, data)
        notify(t('planForm.updated'), data.title)
      } else {
        await lessonPlansApi.create(data)
        notify(t('planForm.created'), data.title)
      }
      savedRef.current = true
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      <FormField label={t('common.title')} error={error ?? undefined}>
        <TextInput value={title} onValueChange={setTitle} placeholder={t('planForm.titlePh')} autoFocus />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('planForm.level')}>
          <AppSelect value={level} onValueChange={setLevel} items={labels.planLevels} />
        </FormField>
        <FormField label={t('planForm.minutes')}>
          <TextInput type="number" min={5} step={5} value={duration} onValueChange={setDuration} />
        </FormField>
      </div>
      <FormField label={t('plans.focus')} hint={t('planForm.focusHint')}>
        <TagInput value={focusAreas} onChange={setFocusAreas} />
      </FormField>
      <FormField label={t('plans.description')}>
        <TextArea
          value={description}
          onValueChange={setDescription}
          rows={4}
          placeholder={t('planForm.descriptionPh')}
        />
      </FormField>
      <FormField label={t('planForm.images')} hint={t('planForm.imagesHint')}>
        <ImageUpload imageIds={imageIds} onChange={setImageIds} />
      </FormField>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={cancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {plan ? t('common.save') : t('planForm.create')}
        </Button>
      </div>
    </form>
  )
}
