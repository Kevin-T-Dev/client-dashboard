import type { ReactNode } from 'react'
import { Brand } from '@/components/layout/Brand'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Card, CardBody } from '@/components/ui/Card'

export interface AuthLayoutProps {
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Centered card used by the sign-in, register and waiting screens. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <Card>
          <CardBody className="pt-6">
            <h1 className="text-lg font-semibold text-stone-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm leading-6 text-stone-500">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </CardBody>
        </Card>
        {footer && <p className="mt-4 text-center text-sm text-stone-500">{footer}</p>}
        <div className="mt-6 flex justify-center">
          <LanguageSwitch />
        </div>
      </div>
    </div>
  )
}
