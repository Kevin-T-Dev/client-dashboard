import { Toast } from '@base-ui/react/toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/auth/AuthProvider'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster, toastManager } from '@/components/ui/Toaster'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AppointmentSchedule } from '@/pages/appointments/AppointmentSchedule'
import { AppointmentsPage } from '@/pages/appointments/AppointmentsPage'
import { PackageCounter } from '@/pages/appointments/PackageCounter'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SignInPage } from '@/pages/auth/SignInPage'
import { TasksPage } from '@/pages/tasks/TasksPage'
import { LessonPlans } from '@/pages/yoga/LessonPlans'
import { YogaPage } from '@/pages/yoga/YogaPage'
import { YogaSchedule } from '@/pages/yoga/YogaSchedule'

export default function App() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={3500}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="sign-in" element={<SignInPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="board" element={<Navigate to="/tasks" replace />} />
                <Route path="yoga" element={<YogaPage />}>
                  <Route index element={<Navigate to="schedule" replace />} />
                  <Route path="schedule" element={<YogaSchedule />} />
                  <Route path="kanban" element={<Navigate to="/tasks?area=yoga" replace />} />
                  <Route path="plans" element={<LessonPlans />} />
                </Route>
                <Route path="appointments" element={<AppointmentsPage />}>
                  <Route index element={<Navigate to="schedule" replace />} />
                  <Route path="schedule" element={<AppointmentSchedule />} />
                  <Route path="packages" element={<PackageCounter />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </Toast.Provider>
  )
}
