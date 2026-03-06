'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, ShieldAlert, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { AdminSidebar } from '@/components/admin/sidebar'
import { apiUrl } from '@/lib/api'

type ApiComplaint = {
  ticket_id: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  priority: 'high' | 'medium' | 'low'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  department_id: number | null
  created_at: string
  sla_deadline: string | null
  risk_score: number | null
  current_escalation_level: number
}

type ApiDepartment = {
  id: number
  name: string
}

type CountPoint = {
  label: string
  value: number
}

type DepartmentPoint = {
  department: string
  total: number
  resolved: number
  open: number
  overdue: number
  resolutionRate: number
}

const STATUS_ORDER: ApiComplaint['status'][] = [
  'submitted',
  'assigned',
  'in_progress',
  'escalated',
  'resolved',
  'rejected',
]

const PIE_COLORS = ['#D47A2A', '#E8A76A', '#8B7355', '#A89080', '#C5BFB8', '#6B5E54']

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isClosedStatus(status: ApiComplaint['status']): boolean {
  return status === 'resolved' || status === 'rejected'
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export default function InsightsPage() {
  const [complaints, setComplaints] = useState<ApiComplaint[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          throw new Error('Failed to load complaints insights')
        }
        if (!departmentsResponse.ok) {
          throw new Error('Failed to load departments')
        }

        const complaintsJson = await complaintsResponse.json() as { success: boolean; data: ApiComplaint[] }
        const departmentsJson = await departmentsResponse.json() as { success: boolean; data: ApiDepartment[] }

        setComplaints(complaintsJson.data)
        setDepartments(departmentsJson.data)
      })
      .catch((requestError) => {
        if (requestError instanceof Error) {
          setError(requestError.message)
        } else {
          setError('Failed to load insights')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const nowMs = Date.now()

  const departmentNameById = useMemo(() => {
    return new Map<number, string>(departments.map((department) => [department.id, department.name]))
  }, [departments])

  const totalComplaints = complaints.length
  const resolvedCount = complaints.filter((item) => item.status === 'resolved').length
  const highPriorityCount = complaints.filter((item) => item.priority === 'high').length

  const overdueCount = complaints.filter((item) => {
    if (isClosedStatus(item.status) || !item.sla_deadline) {
      return false
    }
    const deadline = new Date(item.sla_deadline)
    return !Number.isNaN(deadline.getTime()) && deadline.getTime() < nowMs
  }).length

  const averageRiskScore = useMemo(() => {
    const validScores = complaints
      .map((item) => item.risk_score)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    if (validScores.length === 0) {
      return null
    }
    const sum = validScores.reduce((acc, current) => acc + current, 0)
    return sum / validScores.length
  }, [complaints])

  const resolutionRate = totalComplaints > 0 ? (resolvedCount / totalComplaints) * 100 : 0
  const highPriorityRate = totalComplaints > 0 ? (highPriorityCount / totalComplaints) * 100 : 0

  const statusData: CountPoint[] = useMemo(() => {
    const statusCounts = new Map<ApiComplaint['status'], number>()
    complaints.forEach((item) => {
      statusCounts.set(item.status, (statusCounts.get(item.status) ?? 0) + 1)
    })

    return STATUS_ORDER.map((status) => ({
      label: toTitleCase(status),
      value: statusCounts.get(status) ?? 0,
    }))
  }, [complaints])

  const categoryData: CountPoint[] = useMemo(() => {
    const categoryCounts = new Map<string, number>()
    complaints.forEach((item) => {
      const label = toTitleCase(item.category)
      categoryCounts.set(label, (categoryCounts.get(label) ?? 0) + 1)
    })

    return Array.from(categoryCounts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
  }, [complaints])

  const priorityData: CountPoint[] = useMemo(() => {
    const counts: Record<ApiComplaint['priority'], number> = {
      high: 0,
      medium: 0,
      low: 0,
    }
    complaints.forEach((item) => {
      counts[item.priority] += 1
    })

    return [
      { label: 'High', value: counts.high },
      { label: 'Medium', value: counts.medium },
      { label: 'Low', value: counts.low },
    ]
  }, [complaints])

  const wardData: CountPoint[] = useMemo(() => {
    const counts = new Map<string, number>()
    complaints.forEach((item) => {
      const wardLabel = item.ward?.trim() || 'Unknown Ward'
      counts.set(wardLabel, (counts.get(wardLabel) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [complaints])

  const departmentData: DepartmentPoint[] = useMemo(() => {
    const groups = new Map<string, DepartmentPoint>()

    complaints.forEach((item) => {
      const department = item.department_id !== null
        ? departmentNameById.get(item.department_id) || 'Unassigned'
        : 'Unassigned'
      const existing = groups.get(department) ?? {
        department,
        total: 0,
        resolved: 0,
        open: 0,
        overdue: 0,
        resolutionRate: 0,
      }

      existing.total += 1
      if (item.status === 'resolved') {
        existing.resolved += 1
      }
      if (!isClosedStatus(item.status)) {
        existing.open += 1
      }

      if (!isClosedStatus(item.status) && item.sla_deadline) {
        const deadline = new Date(item.sla_deadline)
        if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < nowMs) {
          existing.overdue += 1
        }
      }

      groups.set(department, existing)
    })

    return Array.from(groups.values())
      .map((item) => ({
        ...item,
        resolutionRate: item.total > 0 ? (item.resolved / item.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [complaints, departmentNameById, nowMs])

  const dailyTrendData = useMemo(() => {
    const dayMap = new Map<string, number>()
    const days = 10

    for (let offset = days - 1; offset >= 0; offset -= 1) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - offset)
      const key = day.toISOString().slice(0, 10)
      dayMap.set(key, 0)
    }

    complaints.forEach((item) => {
      const complaintDate = new Date(item.created_at)
      if (Number.isNaN(complaintDate.getTime())) {
        return
      }
      complaintDate.setHours(0, 0, 0, 0)
      const key = complaintDate.toISOString().slice(0, 10)
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
      }
    })

    return Array.from(dayMap.entries()).map(([key, value]) => ({
      label: new Date(key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value,
    }))
  }, [complaints])

  return (
    <>
      <AdminSidebar />
      <div className="ml-64 min-h-screen bg-background p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-3xl font-bold text-foreground">Complaints AI Insights</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Full analytics view for complaint volume, performance trends, SLA risks, and escalation signals.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
              Loading analytics dashboard...
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Complaints</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{totalComplaints}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Resolution Rate</p>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-emerald-600">{formatPercent(resolutionRate)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Overdue Tickets</p>
                    <Clock3 className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-red-600">{overdueCount}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">High Priority</p>
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-orange-600">{formatPercent(highPriorityRate)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg Risk Score</p>
                    <ShieldAlert className="h-4 w-4 text-amber-700" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-amber-700">
                    {averageRiskScore === null ? 'NA' : averageRiskScore.toFixed(1)}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold text-foreground">Daily Complaint Trend</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Last 10 days filing pattern</p>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrendData}>
                        <defs>
                          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D47A2A" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#D47A2A" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#D47A2A" fill="url(#trendFill)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold text-foreground">Status Distribution</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Current workflow position of complaints</p>
                  <div className="mt-4 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} dataKey="value" nameKey="label" outerRadius={110} innerRadius={55}>
                          {statusData.map((item, index) => (
                            <Cell key={item.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold text-foreground">Category Breakdown</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Most common citizen issue categories</p>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 18 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={120} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8B7355" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold text-foreground">Ward Hotspots</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Top wards by complaint load</p>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wardData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#A89080" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <div className="rounded-xl border border-border bg-card p-5 xl:col-span-3">
                  <h2 className="text-lg font-semibold text-foreground">Department Performance</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Resolved vs open tickets by department</p>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" tick={{ fontSize: 10 }} interval={0} angle={-16} textAnchor="end" height={56} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="resolved" stackId="a" fill="#5E8B7E" name="Resolved" />
                        <Bar dataKey="open" stackId="a" fill="#C89A65" name="Open" />
                        <Bar dataKey="overdue" stackId="a" fill="#B35A3C" name="Overdue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
                  <h2 className="text-lg font-semibold text-foreground">Priority Mix</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Risk-level composition of active inflow</p>
                  <div className="mt-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={priorityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#6B5E54" strokeWidth={3} dot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

            </>
          )}
        </div>
      </div>
    </>
  )
}
