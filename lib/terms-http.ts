import { NextResponse } from 'next/server'

import { TermsNotAcceptedError, TermsNotConfiguredError } from './terms-enforcement'

export function termsEnforcementErrorResponse(error: unknown) {
  if (error instanceof TermsNotAcceptedError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        missing: error.missingTerms.map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          audience: t.audience,
        })),
      },
      { status: 403 },
    )
  }

  if (error instanceof TermsNotConfiguredError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        missing: error.missing,
      },
      { status: 503 },
    )
  }

  return null
}
