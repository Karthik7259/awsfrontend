import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-xl bg-card border border-border rounded-lg p-8 text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            href="/admin-login"
            className="px-4 py-2 rounded-md border border-border hover:bg-secondary text-sm"
          >
            Department Admin Login
          </Link>
          <Link
            href="/super-admin-login"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Super Admin Login
          </Link>
        </div>
      </div>
    </main>
  )
}
