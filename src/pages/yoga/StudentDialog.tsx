import { Trash } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AppDialog } from '@/components/ui/Dialog'
import { FormField, TextArea, TextInput } from '@/components/ui/Field'
import { TagInput } from '@/components/ui/TagInput'
import { notify } from '@/components/ui/Toaster'
import { deleteStudentDeep, studentsApi } from '@/db/api'
import type { Student } from '@/db/types'

export interface StudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student
  onDeleted?: (id: string) => void
}

export function StudentDialog(props: StudentDialogProps) {
  const { t } = useTranslation()
  const { open, onOpenChange, student } = props
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={student ? t('student.edit') : t('student.new')}
      description={t('student.intro')}
    >
      <StudentForm key={student?.id ?? 'new'} {...props} />
    </AppDialog>
  )
}

function StudentForm({ onOpenChange, student, onDeleted }: StudentDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(student?.name ?? '')
  const [focusAreas, setFocusAreas] = useState<string[]>(student?.focusAreas ?? [])
  const [goals, setGoals] = useState(student?.goals ?? '')
  const [notes, setNotes] = useState(student?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    if (!name.trim()) return setError(t('student.needName'))
    setError(null)
    const data = {
      name: name.trim(),
      focusAreas,
      goals: goals.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (student) {
      await studentsApi.update(student.id, data)
      notify(t('student.updated'), data.name)
    } else {
      await studentsApi.create({ ...data, assignedPlanIds: [] })
      notify(t('student.added'), data.name)
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
      <FormField label={t('student.name')} error={error ?? undefined}>
        <TextInput value={name} onValueChange={setName} placeholder={t('student.namePh')} autoFocus />
      </FormField>
      <FormField label={t('student.focus')} hint={t('student.focusHint')}>
        <TagInput value={focusAreas} onChange={setFocusAreas} />
      </FormField>
      <FormField label={t('student.goals')}>
        <TextArea value={goals} onValueChange={setGoals} placeholder={t('student.goalsPh')} />
      </FormField>
      <FormField label={t('common.notes')}>
        <TextArea value={notes} onValueChange={setNotes} placeholder={t('student.notesPh')} />
      </FormField>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {student && (
          <Button variant="danger" className="mr-auto" leadingIcon={<Trash size={14} />} onClick={() => setConfirmDelete(true)}>
            {t('common.delete')}
          </Button>
        )}
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit">{student ? t('common.save') : t('student.add')}</Button>
      </div>

      {student && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('student.removeTitle', { name: student.name })}
          description={t('student.removeBody')}
          confirmLabel={t('student.remove')}
          destructive
          onConfirm={async () => {
            await deleteStudentDeep(student.id)
            onDeleted?.(student.id)
            notify(t('student.removed'), student.name)
            onOpenChange(false)
          }}
        />
      )}
    </form>
  )
}
