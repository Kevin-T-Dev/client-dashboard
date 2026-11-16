import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm'

export interface ButtonProps extends Omit<ComponentProps<typeof BaseButton>, 'className'> {
  variant?: ButtonVariant
  size?: ButtonSize
  leadingIcon?: ReactNode
  className?: string
}

const base =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap select-none transition-[color,background-color,transform,box-shadow] duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 data-disabled:pointer-events-none data-disabled:translate-y-0 data-disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  accent: 'bg-accent-600 text-white shadow-sm hover:bg-accent-700 active:bg-accent-800',
  secondary:
    'border border-stone-200 bg-white text-stone-800 shadow-sm hover:bg-stone-50 active:bg-stone-100',
  ghost: 'bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50 active:bg-red-100',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  icon: 'size-9 p-0',
  'icon-sm': 'size-8 p-0',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  leadingIcon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {leadingIcon}
      {children}
    </BaseButton>
  )
}
