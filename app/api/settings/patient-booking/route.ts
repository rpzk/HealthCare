import { NextResponse } from 'next/server'
import { withPatientAuth, withAdminAuthUnlimited } from '@/lib/advanced-auth'
import { SystemSettingsService, SettingCategory } from '@/lib/system-settings-service'

const KEY = 'PATIENT_DIRECT_BOOKING_ENABLED'

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  return defaultValue
}

// GET /api/settings/patient-booking - Patient-facing booking policy
export const GET = withPatientAuth(async () => {
  const raw = await SystemSettingsService.get(KEY, 'false')
  const directBookingEnabled = parseBoolean(raw, false)
  return NextResponse.json({ directBookingEnabled })
})

// POST /api/settings/patient-booking - Admin sets booking policy
export const POST = withAdminAuthUnlimited(async (req, { user }) => {
  const body = await req.json().catch(() => null)
  const directBookingEnabled = Boolean(body?.directBookingEnabled)

  await SystemSettingsService.set(KEY, String(directBookingEnabled), {
    category: SettingCategory.SYSTEM,
    description: 'Permite que pacientes agendem diretamente pela agenda (auto-agendamento). Quando desabilitado, o fluxo deve ser apenas solicitação/triagem.',
    isPublic: false,
    encrypted: false,
    updatedBy: user.id,
  })

  return NextResponse.json({ success: true, directBookingEnabled })
})
