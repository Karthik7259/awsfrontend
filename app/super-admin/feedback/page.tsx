'use client'

import { useEffect, useMemo, useState } from 'react'

import { AdminSidebar } from '@/components/admin/sidebar'
import { apiUrl } from '@/lib/api'

type FeedbackRow = {
  id: number
  ticket_id: string
  rating: number
  comment: string | null
  category: string
  status: string
  ward: string
  department: string
  created_at: string
}

type FeedbackResponse = {
  success: boolean
  data: FeedbackRow[]
}

export default function SuperAdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    if (!token) {
      setError('Admin token not found. Please login again.')
      setLoading(false)
      return
    }

    fetch(apiUrl('/api/admin/feedback'), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        const body = (await response.json()) as FeedbackResponse | { detail?: string }
        if (!response.ok) {
          throw new Error(typeof body === 'object' && body && 'detail' in body ? body.detail || 'Failed to load feedback' : 'Failed to load feedback')
        }

        const data = body as FeedbackResponse
        setRows(data.data)
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Failed to load feedback')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return rows
    }

    return rows.filter((item) => {
      return (
        item.ticket_id.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.ward.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.comment || '').toLowerCase().includes(query)
      )
    })
  }, [rows, search])

  const averageRating = useMemo(() => {
    if (!rows.length) {
      return 0
    }
    const sum = rows.reduce((acc, item) => acc + item.rating, 0)
    return sum / rows.length
  }, [rows])

  return (
    <>
      <AdminSidebar isSuperAdmin />
      <div className="ml-64 p-8 bg-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Citizen Feedback</h1>
            <p className="text-muted-foreground mt-1">Collected feedback across all departments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Feedback</div>
              <div className="text-3xl font-bold text-foreground">{rows.length}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Average Rating</div>
              <div className="text-3xl font-bold text-amber-600">{averageRating.toFixed(2)} / 5</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Low Ratings ({'<='} 2)</div>
              <div className="text-3xl font-bold text-red-600">{rows.filter((item) => item.rating <= 2).length}</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ticket, department, ward, category, comment"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          {loading ? (
            <div className="bg-card border border-border rounded-lg p-6 text-sm text-muted-foreground">Loading feedback...</div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Ticket</th>
                      <th className="px-4 py-3 text-left font-medium">Rating</th>
                      <th className="px-4 py-3 text-left font-medium">Department</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Ward</th>
                      <th className="px-4 py-3 text-left font-medium">Comment</th>
                      <th className="px-4 py-3 text-left font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.ticket_id}</td>
                        <td className="px-4 py-3">{row.rating}/5</td>
                        <td className="px-4 py-3">{row.department}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3">{row.status}</td>
                        <td className="px-4 py-3">{row.ward}</td>
                        <td className="px-4 py-3 max-w-sm truncate">{row.comment || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No feedback entries found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
