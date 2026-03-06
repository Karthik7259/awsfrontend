'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { AdminSidebar } from '@/components/admin/sidebar'
import { apiUrl } from '@/lib/api'

type ApiComplaint = {
  ticket_id: string
  category: 'roads' | 'water' | 'electricity' | 'sanitation' | 'street_lights' | 'safety' | 'parks' | 'other'
  status: 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'
  ward: string
  created_at: string
  sla_deadline: string | null
}

type CountPoint = {
  label: string
  value: number
}

function toTitleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isClosedStatus(status: ApiComplaint['status']): boolean {
  return status === 'resolved' || status === 'rejected'
}

export default function AdminDashboardPage() {
  const [complaints, setComplaints] = useState<ApiComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    fetch(apiUrl('/api/admin/complaints/me'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load complaints')
        }
        const json = await response.json() as { success: boolean; data: ApiComplaint[] }
        setComplaints(json.data)
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

  const categoryData: CountPoint[] = useMemo(() => {
    const counts = new Map<string, number>()
    complaints.forEach((item) => {
      const label = toTitleCase(item.category)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [complaints])

  const areaData: CountPoint[] = useMemo(() => {
    const counts = new Map<string, number>()
    complaints.forEach((item) => {
      const ward = item.ward?.trim() || 'Unknown Ward'
      counts.set(ward, (counts.get(ward) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [complaints])

  const resolutionTimeData = useMemo(() => {
    const byDay = new Map<string, { sum: number; count: number }>()

    complaints.forEach((item) => {
      if (!item.sla_deadline) {
        return
      }

      const created = new Date(item.created_at)
      const deadline = new Date(item.sla_deadline)
      if (Number.isNaN(created.getTime()) || Number.isNaN(deadline.getTime())) {
        return
      }

      const hours = (deadline.getTime() - created.getTime()) / (1000 * 60 * 60)
      if (hours <= 0) {
        return
      }

      const key = created.toISOString().slice(0, 10)
      const existing = byDay.get(key) ?? { sum: 0, count: 0 }
      existing.sum += hours
      existing.count += 1
      byDay.set(key, existing)
    })

    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10)
      .map(([key, value]) => ({
        label: new Date(key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        value: Number((value.sum / value.count).toFixed(1)),
      }))
  }, [complaints])

  const aiPatternNotes = useMemo(() => {
    if (complaints.length === 0) {
      return ['No complaint data available for pattern detection.']
    }

    const topCategory = categoryData[0]
    const openCount = complaints.filter((item) => !isClosedStatus(item.status)).length
    const escalatedCount = complaints.filter((item) => item.status === 'escalated').length

    const notes: string[] = []
    if (topCategory) {
      notes.push(`Top pattern: ${topCategory.label} has ${topCategory.value} complaints.`)
    }
    notes.push(`Open pipeline currently has ${openCount} complaints.`)
    notes.push(`Escalated complaints detected: ${escalatedCount}.`)
    return notes
  }, [categoryData, complaints])

  return (
    <>
      <AdminSidebar />
      <div className="ml-64 min-h-screen bg-background p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h1 className="text-3xl font-bold text-foreground">Insights</h1>
            <p className="mt-2 text-sm text-muted-foreground">Focused analytics without complaint table.</p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading insights...
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">AI Pattern Detection</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {aiPatternNotes.map((note) => (
                    <div key={note} className="rounded-md border border-border bg-secondary/20 p-3 text-sm text-foreground">
                      {note}
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8B7355" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">Area Analysis</h2>
                <p className="mt-1 text-xs text-muted-foreground">Complaint concentration by ward</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={areaData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#A89080" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold text-foreground">Resolution Time Graph</h2>
                <p className="mt-1 text-xs text-muted-foreground">Average SLA window (hours) by complaint creation day</p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={resolutionTimeData}>
                      <defs>
                        <linearGradient id="resolutionFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D47A2A" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#D47A2A" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#D47A2A" fill="url(#resolutionFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
