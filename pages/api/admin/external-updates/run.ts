import { NextApiRequest, NextApiResponse } from 'next'
import { ExternalUpdatesService, ExternalFetchAdapter } from '@/lib/external-updates-service'
import { icd10WhoAdapter } from '@/lib/adapters/icd10-who'
import { icd11WhoAdapter } from '@/lib/adapters/icd11-who'
import { ciap2Adapter } from '@/lib/adapters/ciap2'
import { nursingClassificationAdapter } from '@/lib/adapters/nursing'
import { cboOfficialAdapter } from '@/lib/adapters/cbo-official'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth'

interface CustomSession {
  user?: (Session['user'] & { role?: string }) | undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verificar autenticação e permissão de admin
  const session = await getServerSession(req, res, authOptions) as CustomSession | null
  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }

if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { dryRun, source, retireMissing, preview } = req.body || {}
  let adapter: ExternalFetchAdapter<unknown>
  switch (source) {
    case 'ICD11': adapter = icd11WhoAdapter; break
    case 'CIAP2': adapter = ciap2Adapter; break
    case 'NURSING': adapter = nursingClassificationAdapter; break
    case 'CBO': adapter = cboOfficialAdapter; break
    case 'ICD10':
    default: adapter = icd10WhoAdapter; break
  }
  const service = new ExternalUpdatesService(adapter)
  try {
    const result = await service.runUpdate({ dryRun, retireMissing, preview })
    res.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao executar atualização externa.'
    res.status(500).json({ ok: false, error: message })
  }
}
