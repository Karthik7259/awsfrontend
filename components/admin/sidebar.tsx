'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, BarChart3, AlertCircle, LogOut } from 'lucide-react'

interface SidebarProps {
  isSuperAdmin?: boolean
}

export function AdminSidebar({ isSuperAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const adminLinks = [
    { href: '/admin/insights', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/complaints', label: 'Complaints', icon: FileText },
    { href: '/admin/dashboard', label: 'Insights', icon: BarChart3 },
    { href: '/admin/alerts', label: 'Alerts', icon: AlertCircle },
  ]

  const superAdminLinks = [
    { href: '/super-admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/super-admin/departments', label: 'All Departments', icon: BarChart3 },
    { href: '/super-admin/feedback', label: 'Feedback', icon: BarChart3 },
  ]

  const links = isSuperAdmin ? superAdminLinks : adminLinks

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_profile')
    document.cookie = 'admin_access_token=; Path=/; Max-Age=0; SameSite=Lax'
    router.push(isSuperAdmin ? '/super-admin-login' : '/admin-login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border pt-6 flex flex-col">
      <div className="px-6 mb-8">
        <h2 className="text-xl font-bold text-foreground">Grievance-Mitra</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isSuperAdmin ? 'Super Admin' : 'Department Admin'}
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-6 border-t border-border pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
