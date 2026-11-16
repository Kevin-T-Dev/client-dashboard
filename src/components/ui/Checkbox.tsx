import { Checkbox } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AppCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  className?: string
  'aria-label'?: string
}

export function AppCheckbox({ checked, onCheckedChange, label, className, ...rest }: AppCheckboxProps) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      aria-label={rest['aria-label'] ?? label}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white text-white transition-colors hover:border-brand-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 data-checked:border-brand-600 data-checked:bg-brand-600',
        className,
      )}
    >
      <Checkbox.Indicator className="flex data-unchecked:hidden">
        <Check size={14} strokeWidth={3} />
      </Checkbox.Indicator>
    </Checkbox.Root>
  )
}
