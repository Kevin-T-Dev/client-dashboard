import { Flower } from 'lucide-react'

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-300/60">
        <Flower size={18} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-stone-900">Kelly Dashboard</div>
      </div>
    </div>
  )
}
