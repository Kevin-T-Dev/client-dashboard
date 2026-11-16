import { Toast } from '@base-ui/react/toast'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster, toastManager } from '@/components/ui/Toaster'
import { bootDatabase } from '@/db/boot'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AppointmentSchedule } from '@/pages/appointments/AppointmentSchedule'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { PackageCounter } from '@/pages/appointments/PackageCounter'
import { LessonPlans } from '@/pages/yoga/LessonPlans'
import { YogaPage } from '@/pages/yoga/YogaPage'
import { YogaSchedule } from '@/pages/yoga/YogaSchedule'

export default function App() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    bootDatabase()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err: unknown) => {
        console.error('Could not open the dashboard database', err)
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.openFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6">
        <h1 className="text-base font-semibold text-stone-900">{t('common.notReady')}</h1>
        <p className="text-sm leading-6 text-stone-600">{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-stone-500">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <Toast.Provider toastManager={toastManager} timeout={3500}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="board" element={<Navigate to="/" replace />} />
            <Route path="yoga" element={<YogaPage />}>
              <Route index element={<Navigate to="schedule" replace />} />
              <Route path="schedule" element={<YogaSchedule />} />
              <Route path="kanban" element={<Navigate to="/" replace />} />
              <Route path="plans" element={<LessonPlans />} />
            </Route>
            <Route path="appointments" element={<AppointmentsPage />}>
              <Route index element={<Navigate to="schedule" replace />} />
              <Route path="schedule" element={<AppointmentSchedule />} />
              <Route path="packages" element={<PackageCounter />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </Toast.Provider>
  )
}
