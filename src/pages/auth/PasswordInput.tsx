import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInput } from '@/components/ui/Field'

export interface PasswordInputProps {
  value: string
  onValueChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
}

export function PasswordInput({ value, onValueChange, autoComplete, disabled }: PasswordInputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <TextInput
        type={visible ? 'text' : 'password'}
        value={value}
        onValueChange={(v) => onValueChange(String(v))}
        autoComplete={autoComplete}
        disabled={disabled}
        required
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-400 hover:text-stone-700"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
