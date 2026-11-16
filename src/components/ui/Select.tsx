import { Select } from '@base-ui/react/select'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export interface SelectItem<V extends string = string> {
  value: V
  label: string
}

export interface AppSelectProps<V extends string> {
  value: V | null | undefined
  onValueChange: (value: V) => void
  items: readonly SelectItem<V>[]
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  /** Visual tone of the highlighted item. */
  tone?: 'brand' | 'accent'
}

/** A dropdown select built on Base UI's Select. */
export function AppSelect<V extends string>({
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  id,
  className,
  tone = 'brand',
}: AppSelectProps<V>) {
  const { t } = useTranslation()
  return (
    <Select.Root
      items={items as SelectItem<V>[]}
      value={value ?? null}
      onValueChange={(next) => {
        if (next !== null && next !== undefined) onValueChange(next as V)
      }}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 text-left text-sm text-stone-900 shadow-xs select-none hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 data-disabled:cursor-not-allowed data-disabled:bg-stone-50 data-disabled:text-stone-400 data-popup-open:border-brand-300',
          className,
        )}
      >
        <Select.Value
          placeholder={placeholder ?? t('common.select')}
          className="min-w-0 flex-1 truncate data-placeholder:text-stone-400"
        />
        <Select.Icon className="shrink-0 text-stone-400">
          <ChevronsUpDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50 outline-none" sideOffset={6} alignItemWithTrigger={false}>
          <Select.Popup className="max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className={cn(
                    'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 py-2 pr-4 pl-2.5 text-sm text-stone-800 outline-none select-none',
                    tone === 'brand'
                      ? 'data-highlighted:bg-brand-50 data-highlighted:text-brand-900'
                      : 'data-highlighted:bg-accent-50 data-highlighted:text-accent-900',
                  )}
                >
                  <Select.ItemIndicator className="col-start-1 text-brand-600">
                    <Check size={14} />
                  </Select.ItemIndicator>
                  <Select.ItemText className="col-start-2 truncate">{item.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
