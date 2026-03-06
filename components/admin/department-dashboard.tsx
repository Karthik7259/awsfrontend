'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

import { apiUrl } from '@/lib/api'

interface Complaint {
  ticketId: string
  category: string
  department: string
  backendStatus: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  status: string
  slaDeadline: string | null
  transcript: string
  imageUrl: string | null
}

type AdminProfile = {
  id: number
  full_name: string
  email: string
  department: string
  created_at: string
}

type ApiComplaint = {
  ticket_id: string
  transcript: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  department_id: number | null
  sla_deadline: string | null
  image_url: string | null
}

type ApiDepartment = {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

type BackendComplaintStatus = ApiComplaint['status']

const STATUS_OPTIONS: Array<{ value: BackendComplaintStatus; label: string }> = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
]

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

function normalizePriority(priority: ApiComplaint['priority']): Complaint['priority'] {
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

  const durationParts: string[] = []
  if (days > 0) {
    durationParts.push(`${days}d`)
  }
  if (hours > 0 || days > 0) {
    durationParts.push(`${hours}h`)
  }
  durationParts.push(`${minutes}m`)
  const duration = durationParts.join(' ')

  if (diffMs <= 0) {
    return `Overdue by ${duration}`
  }

  return `${duration} left`
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'bg-red-100 text-red-700'
    case 'High':
      return 'bg-orange-100 text-orange-700'
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700'
    case 'Low':
      return 'bg-green-100 text-green-700'
    default:
      return ''
  }
}

const getTimeColor = (countdown: string) => {
  return countdown.startsWith('Overdue') ? 'text-red-600 font-bold' : 'text-muted-foreground'
}

export function DepartmentDashboard() {
  const ITEMS_PER_PAGE = 10

  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [statusDraft, setStatusDraft] = useState<BackendComplaintStatus>('submitted')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [nowMs, setNowMs] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)

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
    const raw = localStorage.getItem('admin_profile')
    const token = localStorage.getItem('admin_access_token')
    if (!raw) {
      setLoading(false)
      setError('Admin profile not found. Please login again.')
      return
    }
    if (!token) {
      setLoading(false)
      setError('Admin token not found. Please login again.')
      return
    }

    let parsedProfile: AdminProfile
    try {
      parsedProfile = JSON.parse(raw) as AdminProfile
      setProfile(parsedProfile)
    } catch {
      setLoading(false)
      setError('Invalid admin profile. Please login again.')
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
          throw new Error('Failed to load department complaints')
        }
        if (!departmentsResponse.ok) {
          throw new Error('Failed to load departments')
        }

        const complaintsJson = await complaintsResponse.json() as { success: boolean; data: ApiComplaint[] }
        const departmentsJson = await departmentsResponse.json() as { success: boolean; data: ApiDepartment[] }

        const departmentNameById = new Map<number, string>(
          departmentsJson.data.map((department) => [department.id, department.name]),
        )

        const filtered = complaintsJson.data.map((item) => ({
          ticketId: item.ticket_id,
          category: toTitleCase(item.category),
          department:
            (item.department_id !== null ? departmentNameById.get(item.department_id) : undefined) ||
            CATEGORY_TO_DEPARTMENT[item.category],
          backendStatus: item.status,
          ward: item.ward,
          priority: normalizePriority(item.priority),
          status: toTitleCase(item.status),
          slaDeadline: item.sla_deadline,
          transcript: item.transcript,
          imageUrl: item.image_url,
        }))

        setComplaints(filtered)
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

  const headerText = useMemo(() => {
    if (!profile) {
      return 'Department Admin'
    }
    return `${profile.department} • Admin: ${profile.full_name}`
  }, [profile])

  const handleOpenComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setStatusDraft(complaint.backendStatus)
  }

  const handleUpdateStatus = async () => {
    if (!selectedComplaint) {
      return
    }

    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      return
    }

    setStatusUpdating(true)
    try {
      const response = await fetch(apiUrl(`/admin/complaints/${selectedComplaint.ticketId}/status`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusDraft }),
      })

      if (!response.ok) {
        throw new Error('Failed to update complaint status')
      }

      const statusLabel = toTitleCase(statusDraft)
      setComplaints((prev) =>
        prev.map((item) =>
          item.ticketId === selectedComplaint.ticketId
            ? {
                ...item,
                backendStatus: statusDraft,
                status: statusLabel,
              }
            : item,
        ),
      )

      setSelectedComplaint((prev) =>
        prev
          ? {
              ...prev,
              backendStatus: statusDraft,
              status: statusLabel,
            }
          : prev,
      )
    } catch (updateError) {
      if (updateError instanceof Error) {
        setError(updateError.message)
      } else {
        setError('Failed to update complaint status')
      }
    } finally {
      setStatusUpdating(false)
    }
  }

  const selectedComplaintSla = selectedComplaint
    ? formatSlaCountdown(selectedComplaint.slaDeadline, selectedComplaint.backendStatus, nowMs)
    : null

  const totalPages = Math.max(1, Math.ceil(complaints.length / ITEMS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return complaints.slice(start, start + ITEMS_PER_PAGE)
  }, [complaints, currentPage])

  return (
    <div className="ml-64 p-8 bg-background min-h-screen">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Complaint Queue</h1>
            <p className="text-muted-foreground mt-1">{headerText}</p>
          </div>
        </motion.div>

        {error ? (
          <div className="bg-card border border-border rounded-lg p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* Complaints Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-245">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="w-[16%] px-4 py-3 text-left font-semibold text-foreground">Ticket ID</th>
                  <th className="w-[14%] px-4 py-3 text-left font-semibold text-foreground">Department</th>
                  <th className="w-[12%] px-4 py-3 text-left font-semibold text-foreground">Ward</th>
                  <th className="w-[12%] px-4 py-3 text-left font-semibold text-foreground">Priority</th>
                  <th className="w-[14%] px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="w-[14%] px-4 py-3 text-left font-semibold text-foreground">SLA Countdown</th>
                  <th className="w-[22%] px-4 py-3 text-left font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                      Loading complaints...
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                      No complaints found for your department.
                    </td>
                  </tr>
                ) : paginatedComplaints.map((complaint, index) => {
                  const slaCountdown = formatSlaCountdown(complaint.slaDeadline, complaint.backendStatus, nowMs)

                  return (
                  <motion.tr
                    key={complaint.ticketId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-4 text-primary font-semibold truncate">{complaint.ticketId}</td>
                    <td className="px-4 py-4 truncate">{complaint.department}</td>
                    <td className="px-4 py-4 truncate">{complaint.ward}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 truncate">{complaint.status}</td>
                    <td className={`px-4 py-4 truncate ${getTimeColor(slaCountdown)}`}>
                      {slaCountdown}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleOpenComplaint(complaint)}
                        className="text-primary hover:text-primary/80 font-medium text-xs"
                      >
                        View Details
                      </button>
                    </td>
                  </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && complaints.length > 0 ? (
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-xs md:text-sm">
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
          ) : null}
        </motion.div>
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedComplaint(null)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-card rounded-lg border border-border max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-foreground">Complaint Details</h2>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Complaint info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ticket ID</div>
                  <div className="text-lg font-bold text-primary">{selectedComplaint.ticketId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Category</div>
                  <div className="text-lg font-semibold">{selectedComplaint.category}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ward</div>
                  <div className="text-lg font-semibold">{selectedComplaint.ward}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Priority</div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">SLA Countdown</div>
                  <div className={`text-sm ${selectedComplaintSla ? getTimeColor(selectedComplaintSla) : 'text-muted-foreground'}`}>
                    {selectedComplaintSla ?? 'Not set'}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Conversation Transcript</h3>
                <div className="bg-secondary/30 border border-border rounded p-4 text-sm text-muted-foreground space-y-2">
                  <p>{selectedComplaint.transcript}</p>
                </div>
              </div>

              {/* Complaint Image */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Complaint Image</h3>
                {selectedComplaint.imageUrl ? (
                  <div className="bg-secondary/30 border border-border rounded p-4 space-y-3">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Complaint attachment"
                      className="w-full max-h-64 object-contain rounded border border-border"
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
                  <div className="bg-secondary/30 border border-border rounded p-4 text-sm text-muted-foreground">
                    No image uploaded for this complaint.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Update Status</label>
                  <select
                    value={statusDraft}
                    onChange={(event) => setStatusDraft(event.target.value as BackendComplaintStatus)}
                    className="w-full px-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateStatus}
                  disabled={statusUpdating}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-60"
                >
                  {statusUpdating ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="flex-1 py-2 border border-border text-foreground font-medium rounded-md hover:bg-secondary transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
