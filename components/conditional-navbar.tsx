'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

import { Navbar } from '@/components/navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Keep server and first client render identical; decide by pathname after mount.
  if (!isMounted) {
    return null
  }

  if (pathname.startsWith('/super-admin')) {
    return null
  }

  return <Navbar />
}
