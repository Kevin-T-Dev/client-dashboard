import { Field } from '@base-ui/react/field'
import { Input } from '@base-ui/react/input'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const inputClass =
  'h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-stone-50 disabled:text-stone-400 data-invalid:border-red-400'

export interface FormFieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}

/** Label + control + hint/error wrapper built on Base UI's Field. */
export function FormField({ label, hint, error, children, className }: FormFieldProps) {
  return (
    <Field.Root className={cn('flex min-w-0 flex-col gap-1.5', className)} invalid={!!error}>
      <Field.Label className="text-sm font-medium text-stone-700">{label}</Field.Label>
      {children}
      {hint && !error && <Field.Description className="text-xs text-stone-500">{hint}</Field.Description>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Field.Root>
  )
}

export interface TextInputProps extends Omit<ComponentProps<typeof Input>, 'className'> {
  className?: string
}

export function TextInput({ className, ...props }: TextInputProps) {
  return <Input className={cn(inputClass, className)} {...props} />
}

export interface TextAreaProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  className?: string
}

export function TextArea({ className, value, onValueChange, placeholder, disabled, rows = 3 }: TextAreaProps) {
  return (
    <Field.Control
      render={<textarea rows={rows} />}
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(inputClass, 'h-auto resize-y py-2 leading-relaxed', className)}
    />
  )
}
