/**
 * Generic helper to download a remote file (CSV/ZIP/Excel) and return Buffer.
 * For now uses fetch; could be extended with retries, timeout, proxy, caching.
 */
import fs from 'fs'
import path from 'path'

export async function fetchRawToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed fetch ${url}: ${res.status}`)
  const arrayBuf = await res.arrayBuffer()
  return Buffer.from(arrayBuf)
}

export async function saveTemp(buffer: Buffer, filename: string) {
  const dir = path.join(process.cwd(), 'uploads', 'external-cache')
  await fs.promises.mkdir(dir, { recursive: true })
  const full = path.join(dir, filename)
  await fs.promises.writeFile(full, buffer)
  return full
}
