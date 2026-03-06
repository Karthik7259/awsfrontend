import { AdminSidebar } from '@/components/admin/sidebar'
import { SuperDashboard } from '@/components/admin/super-dashboard'

export default function SuperAdminDashboardPage() {
  return (
    <>
      <AdminSidebar isSuperAdmin />
      <SuperDashboard />
    </>
  )
}
