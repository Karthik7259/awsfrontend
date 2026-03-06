import { Suspense } from 'react'
import { Navbar } from '@/components/navbar'
import { ComplaintTracker } from '@/components/complaint/tracker'

export default function TrackPage() {
  return (
    <>
      <Navbar />
      <Suspense>
        <ComplaintTracker />
      </Suspense>
    </>
  )
}
