import { NextResponse } from 'next/server'
import { ScheduleService } from '@/lib/schedule-service'
import { withAuth } from '@/lib/with-auth'
import { scheduleBodySchema } from '@/lib/validation-schemas-api'

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
    
    // Validate request body - array of schedule rules
    const parseResult = scheduleBodySchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    await ScheduleService.setSchedule(user.id, parseResult.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 })
  }
})
