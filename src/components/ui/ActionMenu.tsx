import { Menu } from '@base-ui/react/menu'
import { Ellipsis } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export interface ActionItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
}

export interface ActionMenuProps {
  items: ActionItem[]
  label?: string
  className?: string
}

/** A "more actions" dropdown built on Base UI's Menu. */
export function ActionMenu({ items, label, className }: ActionMenuProps) {
  const { t } = useTranslation()
  const name = label ?? t('common.moreActions')
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={name}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 sm:size-8 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-brand-500 data-popup-open:bg-stone-100',
          className,
        )}
      >
        <Ellipsis size={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="end">
          <Menu.Popup className="min-w-44 origin-(--transform-origin) rounded-lg border border-stone-200 bg-white py-1 shadow-lg outline-none transition-[scale,opacity] duration-100 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {items.map((item) => (
              <Menu.Item
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                className={cn(
                  'flex cursor-default items-center gap-2 px-3 py-2 text-sm outline-none select-none data-disabled:opacity-40 data-highlighted:bg-stone-100',
                  item.danger ? 'text-red-600' : 'text-stone-800',
                )}
              >
                {item.icon}
                {item.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
