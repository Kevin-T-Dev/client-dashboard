import { Toast } from '@base-ui/react/toast'
import { useTranslation } from 'react-i18next'
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const toastManager = Toast.createToastManager()

export type ToastType = 'success' | 'error' | 'info'

/** Queue a toast from anywhere, including outside React. */
export function notify(title: string, description?: string, type: ToastType = 'success') {
  toastManager.add({ title, description, type })
}

const icons: Record<ToastType, typeof CircleCheck> = {
  success: CircleCheck,
  error: TriangleAlert,
  info: Info,
}

const iconTone: Record<ToastType, string> = {
  success: 'text-brand-600',
  error: 'text-red-600',
  info: 'text-sky-600',
}

function ToastList() {
  const { t } = useTranslation()
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => {
    const type = (toast.type as ToastType | undefined) ?? 'info'
    const Icon = icons[type] ?? Info
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className="relative w-full rounded-xl border border-stone-200 bg-white shadow-lg transition-[opacity,transform] duration-200 ease-out select-none data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
      >
        <Toast.Content className="flex items-start gap-3 p-3.5">
          <Icon size={18} className={cn('mt-0.5 shrink-0', iconTone[type])} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Toast.Title className="text-sm font-semibold text-stone-900" />
            <Toast.Description className="text-sm text-stone-500" />
          </div>
          <Toast.Close
            aria-label={t('common.dismiss')}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={14} />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    )
  })
}

/** Mount once near the app root (inside the Toast.Provider). */
export function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  )
}
