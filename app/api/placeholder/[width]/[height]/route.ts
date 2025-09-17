import { NextRequest, NextResponse } from 'next/server'

export const GET = async (_req: NextRequest, { params }: { params: { width: string; height: string } }) => {
  const w = parseInt(params.width) || 100
  const h = parseInt(params.height) || 100
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
    <rect width='100%' height='100%' fill='#f3f4f6'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='#9ca3af' font-family='sans-serif'>${w}x${h}</text>
  </svg>`
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
