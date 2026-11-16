import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { nowIso } from '@/db/api'
import { db } from '@/db/db'
import type { Task, TaskArea, TaskColumn } from '@/db/types'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'
import { fmtDate, todayKey } from '@/lib/dates'
import { TASK_COLUMN_ORDER, useAppLabels } from '@/lib/labels'
import { TaskDialog } from './TaskDialog'

type AreaFilter = TaskArea | 'all'

/** Re-assigns sequential `order` values within each column. */
function renumber(list: Task[]): Task[] {
  const out: Task[] = []
  for (const col of TASK_COLUMN_ORDER) {
    list
      .filter((t) => t.column === col)
      .sort((a, b) => a.order - b.order)
      .forEach((t, i) => out.push(t.order === i ? t : { ...t, order: i }))
  }
  return out
}

function findColumn(id: UniqueIdentifier, list: Task[]): TaskColumn | undefined {
  if (TASK_COLUMN_ORDER.some((column) => column === id)) return id as TaskColumn
  return list.find((t) => t.id === id)?.column
}

export function YogaKanban() {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const stored = useLiveQuery(() => db.tasks.orderBy('order').toArray(), [])
  const [draft, setDraft] = useState<{ base: Task[] | undefined; list: Task[] } | null>(null)
  const tasks = draft && draft.base === stored ? draft.list : (stored ?? [])

  useEffect(() => {
    if (!stored) return
    const parked = stored.filter((task) => (task.column as string) === 'backlog')
    if (!parked.length) return
    const ts = nowIso()
    void db.tasks.bulkPut(parked.map((task) => ({ ...task, column: 'todo' as const, updatedAt: ts })))
  }, [stored])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [area, setArea] = useState<AreaFilter>('all')
  const [dialog, setDialog] = useState<{ open: boolean; task?: Task; column?: TaskColumn }>({ open: false })

  const visible =
    area === 'all' ? tasks : tasks.filter((t) => (t.area === 'appointments' ? 'appointments' : 'yoga') === area)
  const columns = useMemo(
    () =>
      TASK_COLUMN_ORDER.map((id) => ({
        id,
        title: labels.columnTitle[id],
        hint: labels.columnHint[id],
        tasks: visible.filter((task) => task.column === id).sort((a, b) => a.order - b.order),
      })),
    [visible, labels],
  )
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : undefined

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragStart(e: DragStartEvent) {
    setDraft({ base: stored, list: stored ?? [] })
    setActiveId(String(e.active.id))
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    setDraft((prev) => {
      const list = prev?.list ?? stored ?? []
      const activeCol = findColumn(active.id, list)
      const overCol = findColumn(over.id, list)
      if (!activeCol || !overCol || activeCol === overCol) return prev
      const moving = list.find((t) => t.id === active.id)
      if (!moving) return prev

      const others = list.filter((t) => t.id !== active.id)
      const target = others.filter((t) => t.column === overCol).sort((a, b) => a.order - b.order)
      let index = target.length
      if (over.id !== overCol) {
        const i = target.findIndex((t) => t.id === over.id)
        if (i >= 0) index = i
      }
      target.splice(index, 0, { ...moving, column: overCol })
      const renumbered = target.map((t, i) => ({ ...t, order: i }))
      const next = others.filter((t) => t.column !== overCol).concat(renumbered)
      return { base: stored, list: next }
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const list = draft?.list ?? stored ?? []
    let next = list
    if (over) {
      const activeCol = findColumn(active.id, list)
      const overCol = findColumn(over.id, list)
      if (activeCol && overCol && activeCol === overCol && active.id !== over.id && over.id !== overCol) {
        const colTasks = list.filter((t) => t.column === activeCol).sort((a, b) => a.order - b.order)
        const from = colTasks.findIndex((t) => t.id === active.id)
        const to = colTasks.findIndex((t) => t.id === over.id)
        if (from >= 0 && to >= 0) {
          const moved = arrayMove(colTasks, from, to).map((t, i) => ({ ...t, order: i }))
          const byId = new Map(moved.map((t) => [t.id, t]))
          next = list.map((t) => byId.get(t.id) ?? t)
        }
      }
    }
    const final = renumber(next)
    const changed = final.filter((t) => {
      const before = stored?.find((s) => s.id === t.id)
      return !before || before.column !== t.column || before.order !== t.order
    })
    if (changed.length) {
      const ts = nowIso()
      void db.tasks.bulkPut(changed.map((t) => ({ ...t, updatedAt: ts })))
    }
    setDraft({ base: stored, list: final })
    setActiveId(null)
  }

  function onDragCancel() {
    setDraft(null)
    setActiveId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
          {[{ value: 'all' as const, label: t('common.all') }, ...labels.taskAreas].map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setArea(a.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                area === a.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <Button leadingIcon={<Plus size={16} />} onClick={() => setDialog({ open: true, column: 'todo' })}>
          {t('board.newTask')}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              hint={col.hint}
              tasks={col.tasks}
              emptyLabel={tasks.length === 0 ? t('common.noData') : t('task.dragHere')}
              onOpen={(task) => setDialog({ open: true, task })}
              onAdd={col.id === 'todo' ? () => setDialog({ open: true, column: 'todo' }) : undefined}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        task={dialog.task}
        defaultColumn={dialog.column}
      />
    </div>
  )
}

interface ColumnProps {
  id: TaskColumn
  title: string
  hint: string
  tasks: Task[]
  emptyLabel: string
  onOpen: (task: Task) => void
  onAdd?: () => void
}

function Column({ id, title, hint, tasks, emptyLabel, onOpen, onAdd }: ColumnProps) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="flex min-h-[18rem] flex-col rounded-2xl border border-brand-100 bg-white">
      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
            <span className="rounded-full bg-stone-200 px-1.5 text-[11px] font-medium text-stone-600 tabular-nums">
              {tasks.length}
            </span>
          </div>
          <p className="text-xs text-stone-500">{hint}</p>
        </div>
        {onAdd && (
          <Button size="icon-sm" variant="secondary" aria-label={t('task.add')} onClick={onAdd}>
            <Plus size={14} />
          </Button>
        )}
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-1 flex-col gap-2 rounded-b-xl px-2 pb-2 transition-colors',
            isOver && 'bg-brand-50',
          )}
        >
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onOpen={() => onOpen(task)} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-400">
              {emptyLabel}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Translate.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'opacity-40')}>
      <TaskCardView task={task} onOpen={onOpen} dragging={isDragging} dragProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

const priorityTone = { high: 'danger', medium: 'warning', low: 'neutral' } as const

function shownArea(area: Task['area'] | string): TaskArea {
  return area === 'appointments' ? 'appointments' : 'yoga'
}

interface TaskCardViewProps {
  task: Task
  onOpen?: () => void
  dragging?: boolean
  dragProps?: Record<string, unknown>
}

function TaskCardView({ task, onOpen, dragging, dragProps }: TaskCardViewProps) {
  const { t } = useTranslation()
  const labels = useAppLabels()
  const overdue = task.dueDate && task.dueDate < todayKey() && task.column !== 'done'
  const area = shownArea(task.area)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.()
        }
      }}
      className={cn(
        'w-full cursor-grab touch-none rounded-lg border border-stone-200 bg-white p-3 text-left shadow-xs active:cursor-grabbing',
        dragging && 'rotate-1 cursor-grabbing shadow-lg ring-2 ring-brand-300',
      )}
      {...dragProps}
    >
      <p className={cn('text-sm font-medium text-stone-900', task.column === 'done' && 'text-stone-500 line-through')}>
        {task.title}
      </p>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{task.description}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={area === 'appointments' ? 'accent' : 'brand'}>{labels.taskAreas.find((item) => item.value === area)?.label}</Badge>
        {task.priority !== 'low' && (
          <Badge tone={priorityTone[task.priority]}>{labels.taskPriorities.find((item) => item.value === task.priority)?.label}</Badge>
        )}
        {task.dueDate && (
          <Badge tone={overdue ? 'danger' : 'neutral'}>
            {overdue ? t('common.overdue', { date: fmtDate(task.dueDate) }) : t('common.due', { date: fmtDate(task.dueDate) })}
          </Badge>
        )}
      </div>
    </div>
  )
}
