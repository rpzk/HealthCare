import path from 'path'
import { promises as fs } from 'fs'

/**
 * Minimal STT service abstraction.
 * Requires a real STT backend via STT_URL.
 */
export async function transcribeFile(filePath: string): Promise<{ text: string; provider: string }>{
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  try {
    // Basic sanity check that file exists
    await fs.stat(abs)
  } catch {
    throw new Error('Arquivo de áudio não encontrado para transcrição.')
  }

  const sttUrl = process.env.STT_URL // e.g., http://stt:9000/asr
  const language = process.env.STT_LANGUAGE || 'pt'
  const providerName = process.env.STT_PROVIDER || (sttUrl ? 'faster-whisper' : 'stub')
  const fileName = path.basename(abs)

  if (!sttUrl) {
    throw new Error('STT_URL não configurado. Configure um servidor STT para transcrição.')
  }

  try {
  const buf = await fs.readFile(abs)
    // Best-effort mime detection from ext
    const ext = path.extname(fileName).toLowerCase()
    const mime = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : ext === '.m4a' ? 'audio/m4a' : ext === '.webm' ? 'audio/webm' : 'application/octet-stream'

  const form = new FormData()
  // Copy into a fresh ArrayBuffer to avoid SharedArrayBuffer typing issues
  const arr = new Uint8Array(buf.length)
  arr.set(buf)
  const blob = new Blob([arr.buffer], { type: mime })
    form.append('audio_file', blob, fileName)

    const url = new URL(sttUrl)
    if (language) url.searchParams.set('language', language)
    url.searchParams.set('task', 'transcribe')

    const res = await fetch(url.toString(), {
      method: 'POST',
      body: form
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`STT server error: ${res.status} ${txt}`)
    }
    interface STTResponse {
      text?: string
      segments?: Array<{ text: string }>
    }
    const data: STTResponse = await res.json().catch(() => ({}))
    const text = (typeof data.text === 'string' && data.text.trim())
      || (Array.isArray(data.segments) ? data.segments.map((s) => s.text).join(' ').trim() : '')
    if (!text) throw new Error('Resposta STT sem texto')
    return { text, provider: providerName }
  } catch (e) {
    throw new Error(`Falha na transcrição: ${(e as Error).message}`)
  }
}
