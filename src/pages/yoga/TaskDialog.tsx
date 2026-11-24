import { Trash } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { DatePicker } from '@/components/ui/DatePicker'
import { AppSelect } from '@/components/ui/Select'
import { notify } from '@/components/ui/Toaster'
import { tasksApi } from '@/db/api'
import { db } from '@/db/db'
import type { Task, TaskArea, TaskColumn, TaskPriority } from '@/db/types'
import { todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'
import { parseTaskLines } from './taskAgenda'

export interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task
  defaultColumn?: TaskColumn
  /** yyyy-MM-dd for a new task; defaults to today so it shows on the schedule. */
  defaultDueDate?: string
  defaultArea?: TaskArea
}

export function TaskDialog(props: TaskDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, task } = props
  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={task ? t('task.edit') : t('task.new')}>
      <TaskForm key={task?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function TaskForm({ onOpenChange, task, defaultColumn, defaultDueDate, defaultArea }: TaskDialogProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [column, setColumn] = useState<TaskColumn>(task?.column ?? defaultColumn ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [area, setArea] = useState<TaskArea>(
    task
      ? task.area === 'appointments'
        ? 'appointments'
        : task.area === 'others'
        ? 'others'
        : 'yoga'
      : (defaultArea ?? 'yoga'),
  )
  const [dueDate, setDueDate] = useState(task ? (task.dueDate ?? '') : (defaultDueDate ?? todayKey()))
  const titles = task ? [] : parseTaskLines(title)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    if (task ? !title.trim() : titles.length === 0) return setError(t('task.needTitle'))
    setError(null)
    const shared = {
      description: description.trim() || undefined,
      column,
      priority,
      area,
      dueDate: dueDate || undefined,
    }
    if (task) {
      await tasksApi.update(task.id, { ...shared, title: title.trim() })
      notify(t('task.updated'), title.trim())
    } else {
      const last = await db.tasks.where('column').equals(column).sortBy('order')
      const first = (last.at(-1)?.order ?? -1) + 1
      for (const [i, line] of titles.entries()) await tasksApi.create({ ...shared, title: line, order: first + i })
      if (titles.length === 1) notify(t('task.added'), titles[0])
      else notify(t('task.addedMany', { n: titles.length }), titles.join(' · '))
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
      {task ? (
        <FormField label={t('common.title')} error={error ?? undefined}>
          <TextInput value={title} onValueChange={setTitle} placeholder={t('task.titlePh')} autoFocus />
        </FormField>
      ) : (
        <FormField label={t('common.title')} hint={t('task.batchHint')} error={error ?? undefined}>
          <TextArea value={title} onValueChange={setTitle} placeholder={t('task.batchPh')} rows={4} />
        </FormField>
      )}
      <FormField label={t('task.details')}>
        <TextArea value={description} onValueChange={setDescription} placeholder={t('task.detailsPh')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t('task.column')}>
          <AppSelect value={column} onValueChange={setColumn} items={labels.taskColumnItems} />
        </FormField>
        <FormField label={t('task.priority')}>
          <AppSelect value={priority} onValueChange={setPriority} items={labels.taskPriorities} />
        </FormField>
        <FormField label={t('task.area')}>
          <AppSelect value={area} onValueChange={setArea} items={labels.taskAreas} />
        </FormField>
        <FormField label={t('task.due')}>
          <DatePicker value={dueDate} onValueChange={setDueDate} clearable />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {task && (
          <Button variant="danger" className="mr-auto" leadingIcon={<Trash size={14} />} onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </Button>
        )}
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">
          {task ? t('common.save') : titles.length > 1 ? t('task.addMany', { n: titles.length }) : t('task.add')}
        </Button>
      </div>

      {task && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('task.deleteTitle')}
          description={t('task.deleteBody', { title: task.title })}
          confirmLabel={t('common.delete')}
          destructive
          onConfirm={async () => {
            await tasksApi.remove(task.id)
            notify(t('task.deleted'), task.title)
            onOpenChange(false)
          }}
        />
      )}
    </form>
  )
}
