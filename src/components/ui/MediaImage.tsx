import { useLiveQuery } from 'dexie-react-hooks'
import { ImageOff } from 'lucide-react'
import { db } from '@/db/db'
import { cn } from '@/lib/cn'
import { useObjectUrl } from '@/lib/images'

export interface MediaImageProps {
  id: string
  alt?: string
  className?: string
}

/** Renders an image stored in the local media table. */
export function MediaImage({ id, alt = '', className }: MediaImageProps) {
  const item = useLiveQuery(() => db.media.get(id), [id])
  const url = useObjectUrl(item?.blob)

  if (item === undefined) {
    return <div className={cn('animate-pulse bg-stone-100', className)} aria-hidden="true" />
  }
  if (item === null || !url) {
    return (
      <div className={cn('flex items-center justify-center bg-stone-100 text-stone-400', className)}>
        <ImageOff size={20} />
      </div>
    )
  }
  return <img src={url} alt={alt} className={cn('object-cover', className)} />
}
