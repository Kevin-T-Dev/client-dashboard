import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { dayKey, fmtDayLabel, fmtTime } from '@/lib/dates'

export interface AgendaItem {
  id: string
  start: string
  end: string
  title: string
  subtitle?: ReactNode
  tone: 'brand' | 'accent' | 'muted' | 'task'
  /** Shown without a time, e.g. a to-do due that day. */
  allDay?: boolean
  badges?: ReactNode
  actions?: ReactNode
  onClick?: () => void
}

export interface AgendaListProps {
  items: AgendaItem[]
  /** Group rows under day headings. */
  grouped?: boolean
  emptyMessage?: string
  className?: string
}

const bar: Record<AgendaItem['tone'], string> = {
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  muted: 'bg-stone-300',
  task: 'bg-amber-400',
}

export function AgendaRow({ item }: { item: AgendaItem }) {
  const { t } = useTranslation()
  const Comp = item.onClick ? 'button' : 'div'
  return (
    <div className="flex items-stretch gap-3">
      <Comp
        type={item.onClick ? 'button' : undefined}
        onClick={item.onClick}
        className={cn(
          'flex min-w-0 flex-1 items-start gap-3 rounded-lg px-2 py-2 text-left',
          item.onClick && 'hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-brand-500',
        )}
      >
        <span className={cn('mt-1 h-10 w-1 shrink-0 rounded-full', bar[item.tone])} />
        <span className="w-[4.5rem] shrink-0 pt-0.5 text-xs leading-5 text-stone-500 tabular-nums">
          {item.allDay ? (
            <span className="block font-medium text-amber-700">{t('column.todo')}</span>
          ) : (
            <>
              <span className="block font-medium text-stone-800">{fmtTime(item.start)}</span>
              <span className="block">{fmtTime(item.end)}</span>
            </>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm font-medium text-stone-900',
              item.tone === 'muted' && 'text-stone-500 line-through',
            )}
          >
            {item.title}
          </span>
          {item.subtitle && <span className="mt-0.5 block truncate text-xs text-stone-500">{item.subtitle}</span>}
          {item.badges && <span className="mt-1.5 flex flex-wrap gap-1">{item.badges}</span>}
        </span>
      </Comp>
      {item.actions && <div className="flex items-center">{item.actions}</div>}
    </div>
  )
}

export function AgendaList({ items, grouped = true, emptyMessage = 'Nothing scheduled.', className }: AgendaListProps) {
  useTranslation()
  if (!items.length) {
    return <p className={cn('px-2 py-6 text-center text-sm text-stone-500', className)}>{emptyMessage}</p>
  }

  if (!grouped) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {items.map((item) => (
          <AgendaRow key={item.id} item={item} />
        ))}
      </div>
    )
  }

  const groups = new Map<string, AgendaItem[]>()
  for (const item of items) {
    const key = dayKey(item.start)
    const list = groups.get(key)
    if (list) list.push(item)
    else groups.set(key, [item])
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {[...groups.entries()].map(([key, list]) => (
        <div key={key}>
          <div className="mb-1 flex items-baseline gap-2 px-2">
            <span className="text-xs font-semibold tracking-wide text-stone-700 uppercase">{fmtDayLabel(key)}</span>
            <span className="text-xs text-stone-400">{list.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {list.map((item) => (
              <AgendaRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
