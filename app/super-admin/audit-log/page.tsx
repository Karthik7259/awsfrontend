import { AdminSidebar } from '@/components/admin/sidebar'

export default function SuperAdminAuditLogPage() {
  return (
    <>
      <AdminSidebar isSuperAdmin />
      <div className="ml-64 p-8 bg-background min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">Audit Log</h1>
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            <p>Complete audit trail of super admin actions</p>
          </div>
        </div>
      </div>
    </>
  )
}
