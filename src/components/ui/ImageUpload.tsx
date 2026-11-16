import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addMedia } from '@/db/api'
import { db } from '@/db/db'
import { cn } from '@/lib/cn'
import { compressImage } from '@/lib/images'
import { MediaImage } from './MediaImage'
import { notify } from './Toaster'

export interface ImageUploadProps {
  imageIds: string[]
  onChange: (ids: string[]) => void
  max?: number
}

/**
 * Multi-image uploader. Files are downscaled in the browser and stored in the
 * local media table; the parent only keeps the resulting ids.
 */
export function ImageUpload({ imageIds, onChange, max = 12 }: ImageUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    const room = Math.max(0, max - imageIds.length)
    const accepted = list.slice(0, room)
    if (accepted.length < list.length) notify(t('common.imagesSkipped'), t('common.imagesSkippedBody', { n: max }), 'info')
    setBusy(true)
    try {
      const ids: string[] = []
      for (const file of accepted) {
        const blob = await compressImage(file)
        ids.push(await addMedia(blob, file.name))
      }
      onChange([...imageIds, ...ids])
    } catch (err) {
      console.error(err)
      notify(t('common.uploadFailed'), err instanceof Error ? err.message : t('common.readFailed'), 'error')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove(id: string) {
    onChange(imageIds.filter((x) => x !== id))
    await db.media.delete(id)
  }

  return (
    <div className="flex flex-col gap-3">
      {imageIds.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imageIds.map((id) => (
            <div key={id} className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200">
              <MediaImage id={id} className="size-full" />
              <button
                type="button"
                onClick={() => remove(id)}
                aria-label={t('common.removeImage')}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-stone-700 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors',
          dragging ? 'border-brand-400 bg-brand-50' : 'border-stone-300 hover:border-brand-400 hover:bg-stone-50',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        <ImagePlus size={20} className="text-stone-400" />
        <span className="font-medium text-stone-700">{busy ? t('common.uploading') : t('common.addImages')}</span>
        <span className="text-xs text-stone-500">{t('common.dropImages')}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
      </label>
    </div>
  )
}
