import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { addTag, FOCUS_AREAS, normalizeTag } from '@/lib/tags'

export interface TagInputProps {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: readonly string[]
  placeholder?: string
  id?: string
}

/** Chip-style multi-tag input with clickable suggestions. */
export function TagInput({
  value,
  onChange,
  suggestions = FOCUS_AREAS,
  placeholder,
  id,
}: TagInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const hint = placeholder ?? t('common.tagPlaceholder')

  const commit = (tag: string) => {
    const next = addTag(value, tag)
    if (next !== value) onChange(next)
    setDraft('')
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  const draftNorm = normalizeTag(draft)
  const remaining = suggestions
    .filter((s) => !value.includes(s) && (!draftNorm || s.includes(draftNorm)))
    .slice(0, 8)

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2 shadow-xs focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-brand-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={t('common.removeTag', { tag })}
              className="flex size-4 items-center justify-center rounded-full hover:bg-brand-200"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              if (draftNorm) commit(draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              remove(value[value.length - 1])
            }
          }}
          onBlur={() => {
            if (draftNorm) commit(draft)
          }}
          placeholder={value.length ? '' : hint}
          className="h-7 min-w-32 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-stone-400"
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-stone-100 pt-2">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              className={cn(
                'rounded-full border border-dashed border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800',
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
