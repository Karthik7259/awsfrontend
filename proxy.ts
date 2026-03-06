import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type JwtPayload = {
  is_super_admin?: boolean
}

function decodePayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')

    const json = atob(payload)
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('admin_access_token')?.value
  const pathname = request.nextUrl.pathname

  if (!token) {
    const loginUrl = new URL(pathname.startsWith('/super-admin') ? '/super-admin-login' : '/admin-login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const payload = decodePayload(token)
  const isSuperAdmin = !!payload?.is_super_admin

  if (pathname.startsWith('/super-admin') && !isSuperAdmin) {
    return NextResponse.redirect(new URL('/access-denied', request.url))
  }

  if (pathname.startsWith('/admin') && isSuperAdmin) {
    return NextResponse.redirect(new URL('/super-admin/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/super-admin/:path*'],
}