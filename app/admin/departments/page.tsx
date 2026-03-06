'use client'

import { useEffect, useMemo, useState } from 'react'

import { AdminSidebar } from '@/components/admin/sidebar'
import { useToast } from '@/hooks/use-toast'
import { apiUrl } from '@/lib/api'

type ApiComplaint = {
  ticket_id: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  department_id: number | null
  created_at: string
}

type ApiDepartment = {
  id: number
  name: string
}

type Row = {
  ticketId: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  status: string
  backendStatus: ApiComplaint['status']
  department: string
  ward: string
  createdAt: string
}

const CATEGORY_TO_DEPARTMENT: Record<ApiComplaint['category'], string> = {
  roads: 'Public Works Department',
  water: 'Municipal Corporation',
  electricity: 'Electricity and Power',
  sanitation: 'Municipal Corporation',
  street_lights: 'Municipal Corporation',
  safety: 'Police Department',
  parks: 'Municipal Corporation',
  other: 'Social Welfare',
}

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toPriority(value: ApiComplaint['priority']): Row['priority'] {
  if (value === 'high') {
    return 'High'
  }
  if (value === 'low') {
    return 'Low'
  }
  return 'Medium'
}

function getStatusChip(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'resolved') {
    return 'bg-green-100 text-green-700'
  }
  if (normalized === 'in progress') {
    return 'bg-blue-100 text-blue-700'
  }
  if (normalized === 'escalated' || normalized === 'rejected') {
    return 'bg-red-100 text-red-700'
  }
  return 'bg-slate-100 text-slate-700'
}

export default function DepartmentsPage() {
  const ITEMS_PER_PAGE = 10

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [reopeningTicket, setReopeningTicket] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    Promise.all([
      fetch(apiUrl('/admin/complaints/all'), {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(apiUrl('/complaints/departments')),
    ])
      .then(async ([complaintsResponse, departmentsResponse]) => {
        if (!complaintsResponse.ok) {
          throw new Error('Failed to load complaints')
        }
        if (!departmentsResponse.ok) {
          throw new Error('Failed to load departments')
        }

        const complaintsJson = await complaintsResponse.json() as { success: boolean; data: ApiComplaint[] }
        const departmentsJson = await departmentsResponse.json() as { success: boolean; data: ApiDepartment[] }

        const departmentNameById = new Map<number, string>(
          departmentsJson.data.map((department) => [department.id, department.name]),
        )

        setRows(
          complaintsJson.data.map((item) => ({
            ticketId: item.ticket_id,
            category: toTitleCase(item.category),
            priority: toPriority(item.priority),
            status: toTitleCase(item.status),
            backendStatus: item.status,
            ward: item.ward,
            createdAt: item.created_at,
            department:
              (item.department_id !== null ? departmentNameById.get(item.department_id) : undefined) ||
              CATEGORY_TO_DEPARTMENT[item.category],
          })),
        )
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load complaints')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const departments = useMemo(
    () => Array.from(new Set(rows.map((item) => item.department))).sort((a, b) => a.localeCompare(b)),
    [rows],
  )

  const statuses = useMemo(
    () => Array.from(new Set(rows.map((item) => item.status))).sort((a, b) => a.localeCompare(b)),
    [rows],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return rows.filter((item) => {
      const matchesSearch =
        query.length === 0 ||
        item.ticketId.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.ward.toLowerCase().includes(query)

      const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [rows, search, departmentFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [search, departmentFilter, statusFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, currentPage])

  const handleReopen = async (ticketId: string) => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      toast({
        title: 'Authentication error',
        description: 'Admin token not found. Please login again.',
        variant: 'destructive',
      })
      return
    }

    setReopeningTicket(ticketId)
    try {
      const response = await fetch(apiUrl(`/admin/complaints/${ticketId}/reopen`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json() as { detail?: string; data?: { status?: ApiComplaint['status'] } }
      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to reopen complaint')
      }

      setRows((previous) =>
        previous.map((row) =>
          row.ticketId === ticketId
            ? {
                ...row,
                backendStatus: 'in_progress',
                status: 'In Progress',
              }
            : row,
        ),
      )

      toast({
        title: 'Complaint reopened',
        description: `${ticketId} moved to In Progress.`,
      })
    } catch (requestError) {
      toast({
        title: 'Reopen failed',
        description: requestError instanceof Error ? requestError.message : 'Failed to reopen complaint',
        variant: 'destructive',
      })
    } finally {
      setReopeningTicket(null)
    }
  }

  return (
    <>
      <AdminSidebar isSuperAdmin />
      <div className="ml-64 p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">All Departments - Complaints</h1>

          {error ? (
            <div className="bg-card border border-border rounded-lg p-4 text-sm text-destructive mb-6">{error}</div>
          ) : null}

          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ticket, department, category, ward"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">Loading complaints...</div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Ticket</th>
                      <th className="px-4 py-3 text-left font-medium">Department</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Ward</th>
                      <th className="px-4 py-3 text-left font-medium">Priority</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Created</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.ticketId} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.ticketId}</td>
                        <td className="px-4 py-3">{row.department}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3">{row.ward}</td>
                        <td className="px-4 py-3">{row.priority}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-xs ${getStatusChip(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleReopen(row.ticketId)}
                            disabled={
                              reopeningTicket === row.ticketId ||
                              !['resolved', 'rejected'].includes(row.backendStatus)
                            }
                            className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reopeningTicket === row.ticketId ? 'Reopening...' : 'Reopen'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                          No complaints found for current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {pageRows.length} of {filtered.length} complaints
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs border border-border rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
