'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  adminLogin,
  adminSignup,
  fetchDepartments,
  resendAdminOtps,
  verifyAdminEmailOtp,
} from '@/lib/api'

export default function AdminLoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [verificationStep, setVerificationStep] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [departments, setDepartments] = useState<string[]>([])

  const [emailOtp, setEmailOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('admin_access_token')
    const profile = localStorage.getItem('admin_profile')
    if (token) {
      try {
        const parsed = profile ? (JSON.parse(profile) as { is_super_admin?: boolean }) : null
        router.replace(parsed?.is_super_admin ? '/super-admin/dashboard' : '/admin/insights')
      } catch {
        router.replace('/admin/insights')
      }
    }
  }, [router])

  useEffect(() => {
    let mounted = true
    fetchDepartments()
      .then((items) => {
        if (!mounted) {
          return
        }
        const names = items.map((item) => item.name)
        setDepartments(names)
        if (names.length > 0) {
          setDepartment(names[0])
        }
      })
      .catch(() => {
        if (!mounted) {
          return
        }
        setError('Failed to load departments')
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const response = await adminSignup({
          full_name: fullName,
          email,
          department,
          password,
        })
        setInfo(response.message)
        setVerificationStep(true)
        return
      }

      const response = await adminLogin({ email, password })
      localStorage.setItem('admin_access_token', response.access_token)
      localStorage.setItem('admin_profile', JSON.stringify(response.data))
      document.cookie = `admin_access_token=${response.access_token}; Path=/; Max-Age=86400; SameSite=Lax`
      router.push(response.data.is_super_admin ? '/super-admin/dashboard' : '/admin/insights')
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtps = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const response = await verifyAdminEmailOtp({ email, otp: emailOtp })

      setInfo(response.message)
      setVerificationStep(false)
      setMode('login')
      setEmailOtp('')
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('OTP verification failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setInfo('')
    setLoading(true)

    try {
      const response = await resendAdminOtps({ email })
      setInfo(response.message)
    } catch (requestError) {
      if (requestError instanceof Error) {
        setError(requestError.message)
      } else {
        setError('Failed to resend OTP')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-lg border border-border p-8 space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Admin Login</h1>
            <p className="text-muted-foreground">
              Access the complaint management system
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-md">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setVerificationStep(false)
              }}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-background text-foreground' : 'text-muted-foreground'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setVerificationStep(false)
              }}
              className={`py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-background text-foreground' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="text-sm text-emerald-700" role="status">
              {info}
            </p>
          ) : null}

          {!verificationStep ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Department Admin"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <label htmlFor="department" className="block text-sm font-medium text-foreground">
                      Department
                    </label>
                    <select
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      {departments.map((departmentName) => (
                        <option key={departmentName} value={departmentName}>
                          {departmentName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-60"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtps} className="space-y-5">
              <div className="text-sm text-muted-foreground">
                Enter the OTP sent to your email to complete signup.
              </div>

              <div className="space-y-2">
                <label htmlFor="emailOtp" className="block text-sm font-medium text-foreground">
                  Email OTP
                </label>
                <input
                  id="emailOtp"
                  type="text"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendOtp}
                  className="px-4 py-2 rounded-md border border-border text-sm"
                >
                  Resend
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
