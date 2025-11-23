import path from 'path'
import { promises as fs } from 'fs'

/**
 * Minimal STT service abstraction.
 * For now, returns a placeholder transcript mentioning the file name.
 * Later, plug Whisper/Deepgram/Azure/Google here.
 */
export async function transcribeFile(filePath: string): Promise<{ text: string; provider: string }>{
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  try {
    // Basic sanity check that file exists
    await fs.stat(abs)
  } catch {
    return { text: 'Arquivo de áudio não encontrado para transcrição.', provider: 'stub' }
  }

  const sttUrl = process.env.STT_URL // e.g., http://stt:9000/asr
  const language = process.env.STT_LANGUAGE || 'pt'
  const providerName = process.env.STT_PROVIDER || (sttUrl ? 'faster-whisper' : 'stub')
  const fileName = path.basename(abs)

  if (!sttUrl) {
    // Placeholder output when no server configured
    return {
      text: `Transcrição placeholder do arquivo ${fileName}. Configure STT_URL para ativar transcrição local real.`,
      provider: providerName
    }
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
    const data: any = await res.json().catch(() => ({}))
    const text = (typeof data.text === 'string' && data.text.trim())
      || (Array.isArray(data.segments) ? data.segments.map((s: any) => s.text).join(' ').trim() : '')
    if (!text) throw new Error('Resposta STT sem texto')
    return { text, provider: providerName }
  } catch (e) {
    // Fallback to stub on error, but include hint
    return {
      text: `Falha na transcrição local (${(e as Error).message}). Usando placeholder para ${fileName}.`,
      provider: providerName
    }
  }
}
