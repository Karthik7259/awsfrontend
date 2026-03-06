// 'use client'

// import { useState, useEffect } from 'react'
// import { useSearchParams } from 'next/navigation'
// import dynamic from 'next/dynamic'
// import { motion, AnimatePresence } from 'framer-motion'
// import { CheckCircle2, Clock, AlertCircle, Loader2, ClipboardList, ChevronDown, ChevronUp, X } from 'lucide-react'
// import { NoLocationProvided } from '@/components/complaint/no-location'
// import { apiUrl } from '@/lib/api'

// const LocationDisplay = dynamic(
//   () => import('@/components/complaint/location-display').then(mod => mod.LocationDisplay),
//   {
//     ssr: false, loading: () => (
//       <div className="h-[280px] bg-secondary/30 border border-border rounded-lg flex items-center justify-center">
//         <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
//       </div>
//     )
//   }
// )

// interface TrackingData {
//   ticketId: string
//   category: string
//   ward: string
//   assignedTo: string
//   status: 'Filed' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'
//   filedDate: string
//   locationLat: number | null
//   locationLng: number | null
//   rating?: number
//   feedback?: string
// }

// const steps = ['Filed', 'Assigned', 'In Progress', 'Resolved']

// const DEPARTMENT_MAP: Record<string, string> = {
//   roads: "Public Works Department",
//   water: "Water Supply & Sanitation Board",
//   electricity: "Electricity Department",
//   sanitation: "Sanitation & Waste Management",
//   street_lights: "Municipal Lighting Division",
//   safety: "Law Enforcement & Safety",
//   parks: "Parks & Recreation Department",
//   other: "General Administration",
// }

// const STATUS_MAP: Record<string, TrackingData['status']> = {
//   submitted: "Filed",
//   assigned: "Assigned",
//   in_progress: "In Progress",
//   resolved: "Resolved",
//   rejected: "Rejected",
// }

// export function ComplaintTracker() {
//   const searchParams = useSearchParams()
//   const [searchInput, setSearchInput] = useState('')
//   const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
//   const [isLoading, setIsLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [showFeedback, setShowFeedback] = useState(false)
//   const [rating, setRating] = useState(0)
//   const [comment, setComment] = useState('')
//   const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
//   const [feedbackLoading, setFeedbackLoading] = useState(false)
//   const [feedbackError, setFeedbackError] = useState('')
//   const [myComplaints, setMyComplaints] = useState<string[]>([])
//   const [showMyComplaints, setShowMyComplaints] = useState(false)

//   // Load my complaints from localStorage (only runs in browser)
//   useEffect(() => {
//     try {
//       const raw = localStorage.getItem('my_complaints')
//       if (raw) setMyComplaints(JSON.parse(raw))
//     } catch {
//       console.error('Failed to load my complaints from localStorage')
//     }
//   }, [])

//   // Auto-load ticket if ticketId is passed as a query param
//   useEffect(() => {
//     const ticketId = searchParams.get('ticketId')
//     if (!ticketId) return

//     setSearchInput(ticketId)
//     setIsLoading(true)
//     setError('')
//     setTrackingData(null)

//     fetch(apiUrl(`/complaints/${ticketId}`))
//       .then(async (res) => {
//         if (!res.ok) {
//           if (res.status === 404) throw new Error('No complaint found. Please check the ticket ID.')
//           throw new Error('Failed to fetch complaint details.')
//         }
//         return res.json()
//       })
//       .then((json) => {
//         if (!json.success || !json.data) throw new Error('Invalid response from server.')
//         const data = json.data
//         setTrackingData({
//           ticketId: data.ticket_id,
//           category: data.category.charAt(0).toUpperCase() + data.category.slice(1).replace('_', ' '),
//           ward: data.ward,
//           assignedTo: DEPARTMENT_MAP[data.category] || 'General Administration',
//           status: STATUS_MAP[data.status] || 'Filed',
//           filedDate: new Date(data.created_at).toLocaleDateString('en-GB', {
//             day: '2-digit', month: 'short', year: 'numeric',
//           }),
//           locationLat: data.location_lat ?? null,
//           locationLng: data.location_lng ?? null,
//         })
//       })
//       .catch((err: any) => setError(err.message || 'An error occurred'))
//       .finally(() => setIsLoading(false))
//   }, [searchParams])

//   const handleSearch = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!searchInput.trim()) return

//     setIsLoading(true)
//     setError('')
//     setTrackingData(null)

//     try {
//       const res = await fetch(apiUrl(`/complaints/${searchInput.trim()}`))
//       if (!res.ok) {
//         if (res.status === 404) {
//           throw new Error('No complaint found. Please check the ticket ID.')
//         }
//         throw new Error('Failed to fetch complaint details.')
//       }

//       const json = await res.json()
//       if (!json.success || !json.data) {
//         throw new Error('Invalid response from server.')
//       }

//       const data = json.data

//       const mappedData: TrackingData = {
//         ticketId: data.ticket_id,
//         category: data.category.charAt(0).toUpperCase() + data.category.slice(1).replace('_', ' '),
//         ward: data.ward,
//         assignedTo: DEPARTMENT_MAP[data.category] || "General Administration",
//         status: STATUS_MAP[data.status] || "Filed",
//         filedDate: new Date(data.created_at).toLocaleDateString('en-GB', {
//           day: '2-digit', month: 'short', year: 'numeric'
//         }),
//         locationLat: data.location_lat ?? null,
//         locationLng: data.location_lng ?? null,
//       }

//       setTrackingData(mappedData)
//     } catch (err: any) {
//       setError(err.message || 'An error occurred')
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   const handleSubmitFeedback = async () => {
//     if (!trackingData || rating === 0) return

//     setFeedbackLoading(true)
//     setFeedbackError('')

//     try {
//       const res = await fetch(apiUrl(`/complaints/${trackingData.ticketId}/feedback`), {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           ticket_id: trackingData.ticketId,
//           rating,
//           comment: comment.trim() || null,
//         }),
//       })

//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}))
//         throw new Error(err?.detail ?? 'Failed to submit feedback.')
//       }

//       setFeedbackSubmitted(true)
//     } catch (err: any) {
//       setFeedbackError(err.message || 'Something went wrong. Please try again.')
//     } finally {
//       setFeedbackLoading(false)
//     }
//   }

//   const currentStepIndex = trackingData ? steps.indexOf(trackingData.status) : -1

//   /** Fetch and display a ticket by ID (used by My Complaints list) */
//   const loadTicket = (ticketId: string) => {
//     setSearchInput(ticketId)
//     setIsLoading(true)
//     setError('')
//     setTrackingData(null)
//     setShowMyComplaints(false)

//     fetch(apiUrl(`/complaints/${ticketId}`))
//       .then(async (res) => {
//         if (!res.ok) {
//           if (res.status === 404) throw new Error('No complaint found. Please check the ticket ID.')
//           throw new Error('Failed to fetch complaint details.')
//         }
//         return res.json()
//       })
//       .then((json) => {
//         if (!json.success || !json.data) throw new Error('Invalid response from server.')
//         const data = json.data
//         setTrackingData({
//           ticketId: data.ticket_id,
//           category: data.category.charAt(0).toUpperCase() + data.category.slice(1).replace('_', ' '),
//           ward: data.ward,
//           assignedTo: DEPARTMENT_MAP[data.category] || 'General Administration',
//           status: STATUS_MAP[data.status] || 'Filed',
//           filedDate: new Date(data.created_at).toLocaleDateString('en-GB', {
//             day: '2-digit', month: 'short', year: 'numeric',
//           }),
//           locationLat: data.location_lat ?? null,
//           locationLng: data.location_lng ?? null,
//         })
//       })
//       .catch((err: any) => setError(err.message || 'An error occurred'))
//       .finally(() => setIsLoading(false))
//   }

//   // Remove a ticket ID from the localStorage list 
//   const removeMyComplaint = (ticketId: string) => {
//     const updated = myComplaints.filter((id) => id !== ticketId)
//     setMyComplaints(updated)
//     try { localStorage.setItem('my_complaints', JSON.stringify(updated)) }
//     catch {
//       console.error('Failed to remove my complaint from localStorage')
//     }
//   }

//   return (
//     <main className="min-h-screen bg-background pt-24 pb-12">
//       <div className="max-w-4xl mx-auto px-6 space-y-8">
//         {/* Search */}
//         <motion.div
//           initial={{ opacity: 0, y: -10 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//           className="space-y-4"
//         >
//           <h1 className="text-3xl font-bold text-foreground">Track Your Complaint</h1>

//           {/* My Complaints panel */}
//           {myComplaints.length > 0 && (
//             <div className="border border-border rounded-xl overflow-hidden">
//               <button
//                 onClick={() => setShowMyComplaints((v) => !v)}
//                 className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
//               >
//                 <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
//                   <ClipboardList className="w-4 h-4 text-primary" />
//                   My Complaints
//                   <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
//                     {myComplaints.length}
//                   </span>
//                 </span>
//                 {showMyComplaints
//                   ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
//                   : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
//               </button>
//               <AnimatePresence initial={false}>
//                 {showMyComplaints && (
//                   <motion.div
//                     key="my-complaints-list"
//                     initial={{ height: 0, opacity: 0 }}
//                     animate={{ height: 'auto', opacity: 1 }}
//                     exit={{ height: 0, opacity: 0 }}
//                     transition={{ duration: 0.25 }}
//                     className="overflow-hidden"
//                   >
//                     <ul className="divide-y divide-border">
//                       {myComplaints.map((id) => (
//                         <li key={id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-secondary/40 transition-colors group">
//                           <button
//                             onClick={() => loadTicket(id)}
//                             className="flex-1 text-left text-sm font-mono text-primary hover:underline"
//                           >
//                             {id}
//                           </button>
//                           <button
//                             onClick={() => removeMyComplaint(id)}
//                             className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
//                             aria-label="Remove from my complaints"
//                             title="Remove"
//                           >
//                             <X className="w-3.5 h-3.5" />
//                           </button>
//                         </li>
//                       ))}
//                     </ul>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           )}

//           <form onSubmit={handleSearch} className="flex gap-2">
//             <input
//               type="text"
//               placeholder="Enter Ticket ID (GRV-2026-000042)"
//               value={searchInput}
//               onChange={(e) => setSearchInput(e.target.value)}
//               className="flex-1 px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
//             />
//             <button
//               type="submit"
//               disabled={isLoading}
//               className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
//             >
//               {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
//             </button>
//           </form>
//         </motion.div>

//         {error && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md"
//           >
//             {error}
//           </motion.div>
//         )}

//         {trackingData && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ duration: 0.5 }}
//             className="space-y-8"
//           >
//             {/* Complaint Info Card */}
//             <div className="bg-card border border-border rounded-lg p-6 space-y-4">
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 <div>
//                   <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ticket ID</div>
//                   <div className="text-lg font-bold text-primary">{trackingData.ticketId}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Category</div>
//                   <div className="text-lg font-semibold text-foreground">{trackingData.category}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ward</div>
//                   <div className="text-lg font-semibold text-foreground">{trackingData.ward}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Assigned To</div>
//                   <div className="text-lg font-semibold text-foreground">{trackingData.assignedTo}</div>
//                 </div>
//               </div>
//               <div className="text-sm text-muted-foreground border-t border-border pt-4">
//                 Filed on {trackingData.filedDate}
//               </div>
//             </div>

//             {/* Status Timeline */}
//             <div className="space-y-4">
//               <h2 className="text-lg font-semibold text-foreground">Status Timeline</h2>
//               <div className="space-y-3">
//                 {steps.map((step, index) => {
//                   const isCompleted = trackingData.status === 'Rejected' ? false : index <= currentStepIndex
//                   const isCurrent = trackingData.status === 'Rejected' ? false : index === currentStepIndex

//                   return (
//                     <motion.div
//                       key={step}
//                       initial={{ opacity: 0, x: -10 }}
//                       animate={{ opacity: 1, x: 0 }}
//                       transition={{ duration: 0.3, delay: index * 0.1 }}
//                       className="flex items-start gap-4"
//                     >
//                       <div className="flex flex-col items-center">
//                         <div
//                           className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
//                             ? 'bg-primary text-primary-foreground'
//                             : 'bg-border text-muted-foreground'
//                             }`}
//                         >
//                           {isCompleted ? (
//                             <CheckCircle2 className="w-5 h-5" />
//                           ) : (
//                             <Clock className="w-5 h-5" />
//                           )}
//                         </div>
//                         {index < steps.length - 1 && (
//                           <div
//                             className={`w-1 h-8 my-1 ${isCompleted ? 'bg-primary' : 'bg-border'}`}
//                           />
//                         )}
//                       </div>
//                       <div className={isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'}>
//                         {step}
//                       </div>
//                     </motion.div>
//                   )
//                 })}
//                 {trackingData.status === 'Rejected' && (
//                   <motion.div
//                     initial={{ opacity: 0, x: -10 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     className="flex items-start gap-4"
//                   >
//                     <div className="flex flex-col items-center">
//                       <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground">
//                         <AlertCircle className="w-5 h-5" />
//                       </div>
//                     </div>
//                     <div className="font-semibold text-destructive">
//                       Rejected
//                     </div>
//                   </motion.div>
//                 )}
//               </div>
//             </div>

//             {/* Location Map */}
//             {trackingData.locationLat != null && trackingData.locationLng != null ? (
//               <LocationDisplay
//                 lat={trackingData.locationLat}
//                 lng={trackingData.locationLng}
//               />
//             ) : (
//               <NoLocationProvided />
//             )}

//             {/* Feedback section - show if resolved */}
//             {currentStepIndex === steps.length - 1 && trackingData.status !== 'Rejected' && (
//               <motion.div
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="bg-secondary/30 border border-border rounded-lg p-6 space-y-4"
//               >
//                 {feedbackSubmitted ? (
//                   <div className="flex flex-col items-center gap-2 py-4 text-center">
//                     <CheckCircle2 className="w-8 h-8 text-primary" />
//                     <p className="font-semibold text-foreground">Feedback submitted!</p>
//                     <p className="text-sm text-muted-foreground">Thank you for helping us improve.</p>
//                   </div>
//                 ) : (
//                   <>
//                     <h3 className="text-lg font-semibold text-foreground">Rate Your Experience</h3>

//                     {/* Star rating */}
//                     <div className="flex gap-2">
//                       {[1, 2, 3, 4, 5].map((star) => (
//                         <button
//                           key={star}
//                           onClick={() => setRating(star)}
//                           disabled={feedbackLoading}
//                           className={`text-3xl transition-colors ${star <= rating ? 'text-primary' : 'text-muted-foreground'
//                             }`}
//                         >
//                           ★
//                         </button>
//                       ))}
//                     </div>

//                     {/* Comment */}
//                     <div>
//                       <label className="block text-sm font-medium text-foreground mb-2">
//                         Additional Comments <span className="text-muted-foreground">(Optional)</span>
//                       </label>
//                       <textarea
//                         value={comment}
//                         onChange={(e) => setComment(e.target.value)}
//                         disabled={feedbackLoading}
//                         placeholder="Share your feedback about this complaint resolution..."
//                         className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
//                         rows={3}
//                       />
//                     </div>

//                     {feedbackError && (
//                       <p className="text-sm text-destructive">{feedbackError}</p>
//                     )}

//                     <button
//                       onClick={handleSubmitFeedback}
//                       disabled={rating === 0 || feedbackLoading}
//                       className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
//                     >
//                       {feedbackLoading
//                         ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
//                         : 'Submit Feedback'}
//                     </button>
//                   </>
//                 )}
//               </motion.div>
//             )}
//           </motion.div>
//         )}
//       </div>
//     </main>
//   )
// }

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, Loader2, ClipboardList, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react'
import { NoLocationProvided } from '@/components/complaint/no-location'
import { apiUrl } from '@/lib/api'

const LocationDisplay = dynamic(
  () => import('@/components/complaint/location-display').then(mod => mod.LocationDisplay),
  {
    ssr: false, loading: () => (
      <div className="h-[280px] bg-secondary/30 border border-border rounded-lg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
)

interface TrackingData {
  ticketId: string
  category: string
  ward: string
  assignedTo: string
  status: 'Filed' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'
  filedDate: string
  locationLat: number | null
  locationLng: number | null
  rating?: number
  feedback?: string
}

const steps = ['Filed', 'Assigned', 'In Progress', 'Resolved']

const DEPARTMENT_MAP: Record<string, string> = {
  roads: "Public Works Department",
  water: "Water Supply & Sanitation Board",
  electricity: "Electricity Department",
  sanitation: "Sanitation & Waste Management",
  street_lights: "Municipal Lighting Division",
  safety: "Law Enforcement & Safety",
  parks: "Parks & Recreation Department",
  other: "General Administration",
}

const STATUS_MAP: Record<string, TrackingData['status']> = {
  submitted: "Filed",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
}

const TERMINAL_STATUSES: TrackingData['status'][] = ['Resolved', 'Rejected']
const POLL_INTERVAL_MS = 30_000

export function ComplaintTracker() {
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [myComplaints, setMyComplaints] = useState<string[]>([])
  const [showMyComplaints, setShowMyComplaints] = useState(false)

  // Load my complaints from localStorage (only runs in browser)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('my_complaints')
      if (raw) setMyComplaints(JSON.parse(raw))
    } catch {
      console.error('Failed to load my complaints from localStorage')
    }
  }, [])

  // Shared fetch helper — always bypasses cache 
  const fetchComplaint = useCallback(async (ticketId: string): Promise<TrackingData> => {
    const res = await fetch(apiUrl(`/complaints/${ticketId}`), {
      cache: 'no-store',
    })
    if (!res.ok) {
      if (res.status === 404) throw new Error('No complaint found. Please check the ticket ID.')
      throw new Error('Failed to fetch complaint details.')
    }
    const json = await res.json()
    if (!json.success || !json.data) throw new Error('Invalid response from server.')
    const data = json.data
    return {
      ticketId: data.ticket_id,
      category: data.category.charAt(0).toUpperCase() + data.category.slice(1).replace('_', ' '),
      ward: data.ward,
      assignedTo: DEPARTMENT_MAP[data.category] || 'General Administration',
      status: STATUS_MAP[data.status] || 'Filed',
      filedDate: new Date(data.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      locationLat: data.location_lat ?? null,
      locationLng: data.location_lng ?? null,
    }
  }, [])

  // Auto-load ticket if ticketId is passed as a query param
  useEffect(() => {
    const ticketId = searchParams.get('ticketId')
    if (!ticketId) return

    setSearchInput(ticketId)
    setIsLoading(true)
    setError('')
    setTrackingData(null)

    fetchComplaint(ticketId)
      .then(setTrackingData)
      .catch((err: any) => setError(err.message || 'An error occurred'))
      .finally(() => setIsLoading(false))
  }, [searchParams, fetchComplaint])

  // Auto-poll every 30s while complaint is in a non-terminal state
  useEffect(() => {
    if (!trackingData) return
    if (TERMINAL_STATUSES.includes(trackingData.status)) return

    const interval = setInterval(async () => {
      try {
        const updated = await fetchComplaint(trackingData.ticketId)
        setTrackingData(updated)
      } catch {
        // Silent fail on background poll 
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [trackingData?.ticketId, trackingData?.status, fetchComplaint])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return

    setIsLoading(true)
    setError('')
    setTrackingData(null)

    try {
      const data = await fetchComplaint(searchInput.trim())
      setTrackingData(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Manual refresh button handler
  const handleRefresh = async () => {
    if (!trackingData) return
    setIsRefreshing(true)
    try {
      const updated = await fetchComplaint(trackingData.ticketId)
      setTrackingData(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to refresh.')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!trackingData || rating === 0) return

    setFeedbackLoading(true)
    setFeedbackError('')

    try {
      const res = await fetch(apiUrl(`/complaints/${trackingData.ticketId}/feedback`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: trackingData.ticketId,
          rating,
          comment: comment.trim() || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail ?? 'Failed to submit feedback.')
      }

      setFeedbackSubmitted(true)
    } catch (err: any) {
      setFeedbackError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const currentStepIndex = trackingData ? steps.indexOf(trackingData.status) : -1

  const loadTicket = (ticketId: string) => {
    setSearchInput(ticketId)
    setIsLoading(true)
    setError('')
    setTrackingData(null)
    setShowMyComplaints(false)

    fetchComplaint(ticketId)
      .then(setTrackingData)
      .catch((err: any) => setError(err.message || 'An error occurred'))
      .finally(() => setIsLoading(false))
  }

  const removeMyComplaint = (ticketId: string) => {
    const updated = myComplaints.filter((id) => id !== ticketId)
    setMyComplaints(updated)
    try { localStorage.setItem('my_complaints', JSON.stringify(updated)) }
    catch {
      console.error('Failed to remove my complaint from localStorage')
    }
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <h1 className="text-3xl font-bold text-foreground">Track Your Complaint</h1>

          {/* My Complaints panel */}
          {myComplaints.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowMyComplaints((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  My Complaints
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {myComplaints.length}
                  </span>
                </span>
                {showMyComplaints
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence initial={false}>
                {showMyComplaints && (
                  <motion.div
                    key="my-complaints-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <ul className="divide-y divide-border">
                      {myComplaints.map((id) => (
                        <li key={id} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-secondary/40 transition-colors group">
                          <button
                            onClick={() => loadTicket(id)}
                            className="flex-1 text-left text-sm font-mono text-primary hover:underline"
                          >
                            {id}
                          </button>
                          <button
                            onClick={() => removeMyComplaint(id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                            aria-label="Remove from my complaints"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Ticket ID (GRV-2026-000042)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
          </form>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md"
          >
            {error}
          </motion.div>
        )}

        {trackingData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Complaint Info Card */}
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ticket ID</div>
                  <div className="text-lg font-bold text-primary">{trackingData.ticketId}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Category</div>
                  <div className="text-lg font-semibold text-foreground">{trackingData.category}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Ward</div>
                  <div className="text-lg font-semibold text-foreground">{trackingData.ward}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase mb-1">Assigned To</div>
                  <div className="text-lg font-semibold text-foreground">{trackingData.assignedTo}</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Filed on {trackingData.filedDate}</span>
                {/* Manual refresh button */}
                {!TERMINAL_STATUSES.includes(trackingData.status) && (
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    title="Refresh status"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Status Timeline</h2>
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const isCompleted = trackingData.status === 'Rejected' ? false : index <= currentStepIndex
                  const isCurrent = trackingData.status === 'Rejected' ? false : index === currentStepIndex

                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-border text-muted-foreground'
                            }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-1 h-8 my-1 ${isCompleted ? 'bg-primary' : 'bg-border'}`}
                          />
                        )}
                      </div>
                      <div className={isCurrent ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                        {step}
                      </div>
                    </motion.div>
                  )
                })}
                {trackingData.status === 'Rejected' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="font-semibold text-destructive">
                      Rejected
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Location Map */}
            {trackingData.locationLat != null && trackingData.locationLng != null ? (
              <LocationDisplay
                lat={trackingData.locationLat}
                lng={trackingData.locationLng}
              />
            ) : (
              <NoLocationProvided />
            )}

            {/* Feedback section - show if resolved */}
            {currentStepIndex === steps.length - 1 && trackingData.status !== 'Rejected' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 border border-border rounded-lg p-6 space-y-4"
              >
                {feedbackSubmitted ? (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                    <p className="font-semibold text-foreground">Feedback submitted!</p>
                    <p className="text-sm text-muted-foreground">Thank you for helping us improve.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-foreground">Rate Your Experience</h3>

                    {/* Star rating */}
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          disabled={feedbackLoading}
                          className={`text-3xl transition-colors ${star <= rating ? 'text-primary' : 'text-muted-foreground'
                            }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Additional Comments <span className="text-muted-foreground">(Optional)</span>
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={feedbackLoading}
                        placeholder="Share your feedback about this complaint resolution..."
                        className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
                        rows={3}
                      />
                    </div>

                    {feedbackError && (
                      <p className="text-sm text-destructive">{feedbackError}</p>
                    )}

                    <button
                      onClick={handleSubmitFeedback}
                      disabled={rating === 0 || feedbackLoading}
                      className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {feedbackLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
                        : 'Submit Feedback'}
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}