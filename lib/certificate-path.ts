/**
 * Helper para resolver pfxFilePath de certificados digitais.
 *
 * O path é armazenado de duas formas:
 * - Relativo (novo): "certificates/cert-xxx.pfx" → funciona em dev e Docker
 * - Absoluto (legado): "/home/user/proj/uploads/certificates/xxx.pfx" → falha em Docker
 *
 * Este helper resolve para path absoluto válido no ambiente atual,
 * com fallback para path relativo quando o absoluto não existe.
 */

import path from 'path'
import fs from 'fs/promises'

const UPLOADS_CERTS = 'uploads/certificates'

/**
 * Resolve pfxFilePath para caminho absoluto no sistema de arquivos.
 * Suporta path relativo (padrão atual) e path absoluto legado.
 *
 * @param storedPath - Valor de DigitalCertificate.pfxFilePath
 * @returns Path absoluto se o arquivo existir, ou null
 */
export async function resolveCertificatePath(
  storedPath: string | null | undefined
): Promise<string | null> {
  if (!storedPath?.trim()) return null
  const t = storedPath.trim()

  // Novo formato: relativo (certificates/xxx.pfx ou só xxx.pfx)
  if (!path.isAbsolute(t)) {
    const filename = path.basename(t)
    return path.join(process.cwd(), UPLOADS_CERTS, filename)
  }

  // Path absoluto (legado): tentar direto
  const exists = await fs.access(t).then(() => true).catch(() => false)
  if (exists) return t

  // Fallback: em Docker o path /home/... não existe; tentar relativo
  const fallback = path.join(process.cwd(), UPLOADS_CERTS, path.basename(t))
  const fallbackExists = await fs.access(fallback).then(() => true).catch(() => false)
  return fallbackExists ? fallback : null
}

/**
 * Retorna o path absoluto para tentativa de leitura/remoção, sem verificar existência.
 * Útil para DELETE (tentar unlink mesmo que arquivo possa não existir).
 */
export function getCertificateAbsolutePath(storedPath: string | null | undefined): string | null {
  if (!storedPath?.trim()) return null
  const t = storedPath.trim()
  if (!path.isAbsolute(t)) {
    const filename = path.basename(t)
    return path.join(process.cwd(), UPLOADS_CERTS, filename)
  }
  return t
}
