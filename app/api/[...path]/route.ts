import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = 'https://d2rfea13h6dby4.cloudfront.net'

type RouteContext = {
  params:
    | {
        path: string[]
      }
    | Promise<{
    path: string[]
      }>
}

function buildTargetUrl(pathSegments: string[], search: string): string {
  const rawPath = pathSegments.join('/')
  const upstreamPath = rawPath.startsWith('api/') ? rawPath : `api/${rawPath}`
  return `${BACKEND_BASE_URL}/${upstreamPath}${search}`
}

async function forwardRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const params = await context.params
  const targetUrl = buildTargetUrl(params.path ?? [], request.nextUrl.search)

  const headers = new Headers(request.headers)
  headers.delete('host')

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer()
  }

  const upstreamResponse = await fetch(targetUrl, init)
  const responseHeaders = new Headers(upstreamResponse.headers)

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function HEAD(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}

export async function OPTIONS(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return forwardRequest(request, context)
}
