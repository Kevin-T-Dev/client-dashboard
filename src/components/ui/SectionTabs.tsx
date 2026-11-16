import { Tabs } from '@base-ui/react/tabs'
import type { ReactNode } from 'react'

export interface SectionTab {
  value: string
  label: string
  icon?: ReactNode
}

export interface SectionTabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: SectionTab[]
}

/** A pill-style tab strip built on Base UI's Tabs. Panels are rendered by the caller. */
export function SectionTabs({ value, onValueChange, tabs }: SectionTabsProps) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onValueChange(String(next))}>
      <Tabs.List className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1">
        {tabs.map((tab) => (
          <Tabs.Tab
            key={tab.value}
            value={tab.value}
            className="relative z-10 flex h-9 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium text-stone-600 outline-none select-none hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-brand-500 data-active:text-stone-900"
          >
            {tab.icon}
            {tab.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-1 left-0 z-0 h-9 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-lg bg-white shadow-sm transition-[translate,width] duration-200 ease-out" />
      </Tabs.List>
    </Tabs.Root>
  )
}
