import { SystemSettingsService } from '@/lib/system-settings-service'

export type SignaturePolicy = {
  requireSignature: {
    prescription: boolean
    referral: boolean
    examRequest: boolean
    examResult: boolean
  }
}

export async function getSignaturePolicy(): Promise<SignaturePolicy> {
  const [prescription, referral, examRequest, examResult] = await Promise.all([
    SystemSettingsService.get('REQUIRE_SIGNATURE_PRESCRIPTION_BEFORE_PRINT', 'false'),
    SystemSettingsService.get('REQUIRE_SIGNATURE_REFERRAL_BEFORE_PRINT', 'false'),
    SystemSettingsService.get('REQUIRE_SIGNATURE_EXAM_REQUEST_BEFORE_PRINT', 'false'),
    SystemSettingsService.get('REQUIRE_SIGNATURE_EXAM_RESULT_BEFORE_PRINT', 'false'),
  ])

  return {
    requireSignature: {
      prescription: prescription === 'true',
      referral: referral === 'true',
      examRequest: examRequest === 'true',
      examResult: examResult === 'true',
    },
  }
}
