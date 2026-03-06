import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConditionalNavbar } from '@/components/conditional-navbar'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: 'Grievance-Mitra | Civic Grievance Portal',
  description: 'Your voice. Your ward. Resolved. File and track complaints efficiently.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_inter.className} font-sans antialiased bg-background text-foreground`}>
        <ConditionalNavbar />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
