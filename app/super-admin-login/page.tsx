'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { superAdminLogin } from '@/lib/api'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    const profile = localStorage.getItem('admin_profile')
    if (!token || !profile) {
      return
    }

    try {
      const parsed = JSON.parse(profile) as { is_super_admin?: boolean }
      if (parsed.is_super_admin) {
        router.replace('/super-admin/dashboard')
      }
    } catch {
      // no-op
    }
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await superAdminLogin({ email, password })
      localStorage.setItem('admin_access_token', response.access_token)
      localStorage.setItem('admin_profile', JSON.stringify(response.data))
      document.cookie = `admin_access_token=${response.access_token}; Path=/; Max-Age=86400; SameSite=Lax`
      router.push('/super-admin/dashboard')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 pt-20">
      <div className="w-full max-w-md bg-card rounded-lg border border-border p-8 space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-foreground">Super Admin Login</h1>
          <p className="text-muted-foreground mt-1">Login to access only the super admin dashboard.</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md bg-background"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-60"
          >
            {loading ? 'Please wait...' : 'Login as Super Admin'}
          </button>
        </form>
      </div>
    </main>
  )
}
