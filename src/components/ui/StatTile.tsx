import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'accent' | 'neutral' | 'warning'
  className?: string
}

const tones = {
  brand: 'bg-brand-100 text-brand-700',
  accent: 'bg-accent-100 text-accent-700',
  neutral: 'bg-stone-100 text-stone-600',
  warning: 'bg-amber-100 text-amber-700',
}

export function StatTile({ label, value, hint, icon, tone = 'neutral', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {icon && (
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-stone-500">{hint}</p>}
      </div>
    </div>
  )
}
