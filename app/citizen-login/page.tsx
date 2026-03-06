'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function CitizenLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [showOTP, setShowOTP] = useState(false)

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumber) {
      setShowOTP(true)
    }
  }

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock verification - in a real app, this would verify with backend
    if (otp.length === 6) {
      window.location.href = '/citizen-file'
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
            <h1 className="text-3xl font-bold text-foreground">Citizen Login</h1>
            <p className="text-muted-foreground">
              {showOTP ? 'Enter the OTP sent to your phone' : 'File and track your civic complaints'}
            </p>
          </div>

          {!showOTP ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all"
              >
                Request OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-medium text-foreground">
                  Enter OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary tracking-widest text-center text-lg"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-opacity-90 transition-all"
              >
                Verify OTP
              </button>
              <button
                type="button"
                onClick={() => setShowOTP(false)}
                className="w-full py-2 border border-border text-foreground font-medium rounded-md hover:bg-secondary transition-all"
              >
                Change Number
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  )
}
