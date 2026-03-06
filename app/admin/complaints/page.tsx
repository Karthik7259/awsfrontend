'use client'

import { useEffect, useMemo, useState } from 'react'

import { AdminSidebar } from '@/components/admin/sidebar'
import { useToast } from '@/hooks/use-toast'
import { apiUrl } from '@/lib/api'

type ApiComplaint = {
  ticket_id: string
  transcript: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  department_id: number | null
  sla_deadline: string | null
  image_url?: string | null
}

type ApiDepartment = {
  id: number
  name: string
}

type ComplaintRow = {
  ticketId: string
  category: string
  department: string
  status: string
  backendStatus: ApiComplaint['status']
  priority: 'High' | 'Medium' | 'Low'
  ward: string
  slaDeadline: string | null
  transcript: string
  imageUrl: string | null
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

function normalizePriority(priority: ApiComplaint['priority']): ComplaintRow['priority'] {
  if (priority === 'high') {
    return 'High'
  }
  if (priority === 'low') {
    return 'Low'
  }
  return 'Medium'
}

function formatSlaCountdown(slaDeadline: string | null, status: string, nowMs: number): string {
  const normalizedStatus = status.toLowerCase()
  if (normalizedStatus === 'resolved' || normalizedStatus === 'rejected') {
    return 'Completed'
  }

  if (!slaDeadline) {
    return 'Not set'
  }

  const deadline = new Date(slaDeadline)
  if (Number.isNaN(deadline.getTime())) {
    return 'Invalid deadline'
  }

  const diffMs = deadline.getTime() - nowMs
  const absMs = Math.abs(diffMs)
  const totalMinutes = Math.floor(absMs / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  const parts: string[] = []
  if (days > 0) {
    parts.push(`${days}d`)
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`)
  }
  parts.push(`${minutes}m`)
  const duration = parts.join(' ')

  if (diffMs <= 0) {
    return `Overdue by ${duration}`
  }

  return `${duration} left`
}

function getPriorityColor(priority: ComplaintRow['priority']): string {
  if (priority === 'High') {
    return 'bg-orange-100 text-orange-700'
  }
  if (priority === 'Low') {
    return 'bg-green-100 text-green-700'
  }
  return 'bg-yellow-100 text-yellow-700'
}

function getTimeColor(countdown: string): string {
  return countdown.startsWith('Overdue') ? 'text-red-600 font-bold' : 'text-muted-foreground'
}

function getStatusColor(status: ComplaintRow['backendStatus']): string {
  if (status === 'resolved') {
    return 'bg-green-100 text-green-700'
  }
  if (status === 'in_progress') {
    return 'bg-blue-100 text-blue-700'
  }
  if (status === 'escalated' || status === 'rejected') {
    return 'bg-red-100 text-red-700'
  }
  if (status === 'assigned') {
    return 'bg-indigo-100 text-indigo-700'
  }
  return 'bg-gray-100 text-gray-700'
}

const STATUS_OPTIONS: Array<{ value: ApiComplaint['status']; label: string }> = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
]

export default function ComplaintsPage() {
  const ITEMS_PER_PAGE = 9

  const [rows, setRows] = useState<ComplaintRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nowMs, setNowMs] = useState<number>(0)
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRow | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ApiComplaint['status']>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | ComplaintRow['priority']>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [wardFilter, setWardFilter] = useState<'all' | string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusDraft, setStatusDraft] = useState<ApiComplaint['status']>('submitted')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setNowMs(Date.now())

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    Promise.all([
      fetch(apiUrl('/api/admin/complaints/me'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch(apiUrl('/api/complaints/departments')),
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

        const mappedRows = complaintsJson.data.map((item) => ({
          ticketId: item.ticket_id,
          category: toTitleCase(item.category),
          department:
            (item.department_id !== null ? departmentNameById.get(item.department_id) : undefined) ||
            CATEGORY_TO_DEPARTMENT[item.category],
          status: toTitleCase(item.status),
          backendStatus: item.status,
          priority: normalizePriority(item.priority),
          ward: item.ward,
          slaDeadline: item.sla_deadline,
          transcript: item.transcript,
          imageUrl: item.image_url ?? null,
        }))

        setRows(mappedRows)
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error) {
          setError(fetchError.message)
        } else {
          setError('Failed to load complaints')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const categories = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.category))).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const wards = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.ward))).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const normalizedQuery = searchQuery.trim().toLowerCase()
      const matchesSearch =
        normalizedQuery.length === 0 ||
        row.ticketId.toLowerCase().includes(normalizedQuery) ||
        row.department.toLowerCase().includes(normalizedQuery) ||
        row.category.toLowerCase().includes(normalizedQuery)

      const matchesStatus = statusFilter === 'all' || row.backendStatus === statusFilter
      const matchesPriority = priorityFilter === 'all' || row.priority === priorityFilter
      const matchesCategory = categoryFilter === 'all' || row.category === categoryFilter
      const matchesWard = wardFilter === 'all' || row.ward === wardFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesWard
    })
  }, [rows, searchQuery, statusFilter, priorityFilter, categoryFilter, wardFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setWardFilter('all')
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, priorityFilter, categoryFilter, wardFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRows.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRows, currentPage])

  const selectedComplaintSla = selectedComplaint
    ? formatSlaCountdown(selectedComplaint.slaDeadline, selectedComplaint.backendStatus, nowMs)
    : null

  const handleStatusUpdate = async () => {
    if (!selectedComplaint) {
      return
    }

    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      toast({
        title: 'Authentication error',
        description: 'Admin token not found. Please login again.',
        variant: 'destructive',
      })
      return
    }

    setStatusUpdating(true)
    try {
      const response = await fetch(apiUrl(`/api/admin/complaints/${selectedComplaint.ticketId}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusDraft }),
      })

      const payload = await response.json() as {
        detail?: string
        data?: {
          ticket_id: string
          status: ApiComplaint['status']
        }
      }

      if (!response.ok) {
        throw new Error(payload.detail || 'Failed to update complaint status')
      }

      const updatedStatus = payload.data?.status ?? statusDraft
      const updatedLabel = toTitleCase(updatedStatus)

      setRows((previous) =>
        previous.map((row) =>
          row.ticketId === selectedComplaint.ticketId
            ? {
                ...row,
                backendStatus: updatedStatus,
                status: updatedLabel,
              }
            : row,
        ),
      )

      setSelectedComplaint((current) =>
        current
          ? {
              ...current,
              backendStatus: updatedStatus,
              status: updatedLabel,
            }
          : null,
      )

      toast({
        title: 'Status updated',
        description: `${selectedComplaint.ticketId} moved to ${updatedLabel}.`,
      })
    } catch (requestError) {
      toast({
        title: 'Status update failed',
        description:
          requestError instanceof Error ? requestError.message : 'Failed to update complaint status',
        variant: 'destructive',
      })
    } finally {
      setStatusUpdating(false)
    }
  }

  return (
    <>
      <AdminSidebar />
      <div className="ml-64 p-8 bg-background min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-6">All Complaints</h1>

          {error ? (
            <div className="bg-card border border-border rounded-lg p-4 text-sm text-destructive mb-6">
              {error}
            </div>
          ) : null}

          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search ticket, department, category"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | ApiComplaint['status'])}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as 'all' | ComplaintRow['priority'])}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <select
                  value={wardFilter}
                  onChange={(event) => setWardFilter(event.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Wards</option>
                  {wards.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 border border-border rounded-md text-sm hover:bg-secondary"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
              Loading complaints...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">
              No complaints found for the selected filters.
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedRows.map((row) => {
                const slaCountdown = formatSlaCountdown(row.slaDeadline, row.backendStatus, nowMs)

                return (
                  <article
                    key={row.ticketId}
                    className="bg-card border border-border rounded-lg p-5 space-y-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Ticket ID</p>
                        <p className="text-sm font-semibold text-primary break-all">{row.ticketId}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(row.priority)}`}>
                        {row.priority}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Category:</span> {row.category}</p>
                      <p><span className="text-muted-foreground">Department:</span> {row.department}</p>
                      <p><span className="text-muted-foreground">Ward:</span> {row.ward}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(row.backendStatus)}`}>
                        {row.status}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm ${getTimeColor(slaCountdown)}`}>
                          {slaCountdown}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaint(row)
                            setStatusDraft(row.backendStatus)
                          }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-xs md:text-sm">
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
            </>
          )}
        </div>
      </div>

      {selectedComplaint ? (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedComplaint(null)}
        >
          <div
            className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Complaint Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedComplaint.ticketId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Category</p>
                  <p className="font-medium">{selectedComplaint.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ward</p>
                  <p className="font-medium">{selectedComplaint.ward}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Department</p>
                  <p className="font-medium">{selectedComplaint.department}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Priority</p>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedComplaint.backendStatus)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">SLA Countdown</p>
                  <p className={`font-medium ${selectedComplaintSla ? getTimeColor(selectedComplaintSla) : 'text-muted-foreground'}`}>
                    {selectedComplaintSla ?? 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Transcript</p>
                <div className="bg-secondary/30 border border-border rounded p-3 text-sm text-muted-foreground">
                  {selectedComplaint.transcript || 'No transcript available.'}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Complaint Image</p>
                {selectedComplaint.imageUrl ? (
                  <div className="bg-secondary/30 border border-border rounded p-3 space-y-2">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Complaint attachment"
                      className="w-full max-h-72 object-contain rounded border border-border"
                    />
                    <a
                      href={selectedComplaint.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Open image in new tab
                    </a>
                  </div>
                ) : (
                  <div className="bg-secondary/30 border border-border rounded p-3 text-sm text-muted-foreground">
                    No image uploaded for this complaint.
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Update Status</p>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as ApiComplaint['status'])}
                    disabled={statusUpdating}
                    className="min-w-48 px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleStatusUpdate()}
                    disabled={statusUpdating || statusDraft === selectedComplaint.backendStatus}
                    className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {statusUpdating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
