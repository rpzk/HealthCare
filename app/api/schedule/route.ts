import { NextResponse } from 'next/server'
import { ScheduleService } from '@/lib/schedule-service'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { user }) => {
  try {
    const schedule = await ScheduleService.getSchedule(user.id)
    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json()
    // body should be array of rules
    await ScheduleService.setSchedule(user.id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 })
  }
})
