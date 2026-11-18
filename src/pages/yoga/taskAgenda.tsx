import { Check, Pencil, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AgendaItem } from '@/components/calendar/AgendaList'
import type { CalendarEvent } from '@/components/calendar/MonthCalendar'
import { ActionMenu } from '@/components/ui/ActionMenu'
import { Badge } from '@/components/ui/Badge'
import { notify } from '@/components/ui/Toaster'
import { tasksApi } from '@/db/api'
import { db } from '@/db/db'
import type { Task, TaskArea } from '@/db/types'
import { fmtDate, todayKey } from '@/lib/dates'
import { useAppLabels } from '@/lib/labels'

/** One task per non-empty line, with list bullets and numbering removed. */
export function parseTaskLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·●▪☐□✅✔]|\d+\s*[.)、．:：])\s*/u, '').trim())
    .filter(Boolean)
}

/** Older rows may carry an area that no longer exists; they belong to yoga. */
export function taskArea(task: Task): TaskArea {
  return task.area === 'appointments' ? 'appointments' : 'yoga'
}

/** Local midnight of the due day, so the task sorts before timed items. */
export function taskStart(task: Task): string {
  return `${task.dueDate}T00:00:00`
}

/** Tasks that have a due date, optionally limited to one area. */
export function datedTasks(tasks: Task[], area?: TaskArea): Task[] {
  return tasks.filter((task) => task.dueDate && (!area || taskArea(task) === area))
}

export function taskToEvent(task: Task): CalendarEvent {
  const start = taskStart(task)
  return {
    id: `t-${task.id}`,
    start,
    end: start,
    title: task.title,
    tone: task.column === 'done' ? 'muted' : 'task',
    allDay: true,
  }
}

/** Moves a task to the end of the done column, or back to the end of to-do. */
export async function setTaskDone(task: Task, done: boolean): Promise<void> {
  const column = done ? 'done' : 'todo'
  const list = await db.tasks.where('column').equals(column).sortBy('order')
  const order = (list.at(-1)?.order ?? -1) + 1
  await tasksApi.update(task.id, { column, order })
}

/** Builds agenda rows for tasks, with edit and done actions. */
export function useTaskAgendaItem(onOpen: (task: Task) => void) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const priorityTone = { high: 'danger', medium: 'warning', low: 'neutral' } as const

  async function toggle(task: Task) {
    const done = task.column !== 'done'
    await setTaskDone(task, done)
    notify(done ? t('task.doneToast') : t('task.reopenedToast'), task.title)
  }

  return (task: Task, showArea = false): AgendaItem => {
    const start = taskStart(task)
    const done = task.column === 'done'
    const overdue = !done && !!task.dueDate && task.dueDate < todayKey()
    const area = taskArea(task)
    return {
      id: `t-${task.id}`,
      start,
      end: start,
      allDay: true,
      title: task.title,
      subtitle: task.description,
      tone: done ? 'muted' : 'task',
      badges: (
        <>
          {showArea && (
            <Badge tone={area === 'appointments' ? 'accent' : 'brand'}>
              {labels.taskAreas.find((item) => item.value === area)?.label}
            </Badge>
          )}
          {task.column === 'doing' && <Badge tone="info">{labels.columnTitle.doing}</Badge>}
          {done && <Badge tone="success">{labels.columnTitle.done}</Badge>}
          {!done && task.priority !== 'low' && (
            <Badge tone={priorityTone[task.priority]}>
              {labels.taskPriorities.find((item) => item.value === task.priority)?.label}
            </Badge>
          )}
          {overdue && task.dueDate && <Badge tone="danger">{t('common.overdue', { date: fmtDate(task.dueDate) })}</Badge>}
        </>
      ),
      onClick: () => onOpen(task),
      actions: (
        <ActionMenu
          items={[
            { label: t('common.edit'), icon: <Pencil size={14} />, onClick: () => onOpen(task) },
            done
              ? { label: t('task.reopen'), icon: <RotateCcw size={14} />, onClick: () => void toggle(task) }
              : { label: t('task.markDone'), icon: <Check size={14} />, onClick: () => void toggle(task) },
          ]}
        />
      ),
    }
  }
}
