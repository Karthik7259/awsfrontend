'use client'

import { useEffect, useMemo, useState } from 'react'

import { AdminSidebar } from '@/components/admin/sidebar'
import { apiUrl } from '@/lib/api'

type ApiComplaint = {
  ticket_id: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  department_id: number | null
  current_escalation_level: number
  sla_deadline: string | null
  created_at: string
}

type ApiDepartment = {
  id: number
  name: string
}

type AlertRow = {
  ticketId: string
  category: string
  department: string
  ward: string
  priority: string
  status: string
  escalationLevel: number
  slaDeadline: string
  createdAt: string
}

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not set'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Invalid date'
  }

  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AlertsPage() {
  const ITEMS_PER_PAGE = 10

  const [rows, setRows] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    Promise.all([
      fetch(apiUrl('/admin/complaints/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

        const departmentById = new Map<number, string>(departmentsJson.data.map((item) => [item.id, item.name]))

        const levelThreeAlerts = complaintsJson.data
          .filter((item) => item.current_escalation_level === 3)
          .map((item) => ({
            ticketId: item.ticket_id,
            category: toTitleCase(item.category),
            department: item.department_id !== null ? departmentById.get(item.department_id) || 'Unassigned' : 'Unassigned',
            ward: item.ward || 'Unknown Ward',
            priority: toTitleCase(item.priority),
            status: toTitleCase(item.status),
            escalationLevel: item.current_escalation_level,
            slaDeadline: formatDate(item.sla_deadline),
            createdAt: formatDate(item.created_at),
          }))

        setRows(levelThreeAlerts)
      })
      .catch((requestError) => {
        if (requestError instanceof Error) {
          setError(requestError.message)
        } else {
          setError('Failed to load alerts')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const alertCount = useMemo(() => rows.length, [rows])
  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return rows.slice(start, start + ITEMS_PER_PAGE)
  }, [rows, currentPage])

  return (
    <>
      <AdminSidebar />
      <div className="ml-64 min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-3xl font-bold text-foreground">Alerts</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Complaints with escalation level 3.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                Level 3 only
              </span>
              <span className="inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                Count: {alertCount}
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading escalation alerts...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No complaints found at escalation level 3.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-2 md:p-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-2.5 font-medium">Ticket ID</th>
                      <th className="px-2.5 py-2.5 font-medium">Category</th>
                      <th className="px-2.5 py-2.5 font-medium">Department</th>
                      <th className="px-2.5 py-2.5 font-medium">Ward</th>
                      <th className="px-2.5 py-2.5 font-medium">Priority</th>
                      <th className="px-2.5 py-2.5 font-medium">Status</th>
                      <th className="px-2.5 py-2.5 font-medium">Escalation</th>
                      <th className="px-2.5 py-2.5 font-medium">SLA Deadline</th>
                      <th className="px-2.5 py-2.5 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.ticketId} className="border-b border-border/60">
                        <td className="px-2.5 py-2.5 font-semibold text-primary">{row.ticketId}</td>
                        <td className="px-2.5 py-2.5">{row.category}</td>
                        <td className="px-2.5 py-2.5">{row.department}</td>
                        <td className="px-2.5 py-2.5">{row.ward}</td>
                        <td className="px-2.5 py-2.5">{row.priority}</td>
                        <td className="px-2.5 py-2.5">{row.status}</td>
                        <td className="px-2.5 py-2.5">
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                            Level {row.escalationLevel}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">{row.slaDeadline}</td>
                        <td className="px-2.5 py-2.5">{row.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 px-1 py-1 text-xs md:text-sm">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-md border border-border px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-muted-foreground">{currentPage}/{totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="rounded-md border border-border px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
