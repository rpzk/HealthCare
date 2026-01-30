import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'

// Configuração: ajuste conforme seu ambiente
const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://localhost:3001'
const CERT_PATH = path.join(process.cwd(), 'meucertificado.p12') // Caminho real do seu .p12
const CERT_PASSWORD = process.env.CERTIFICADO_SENHA || 'r' // Senha real do seu .p12

export async function POST(request: NextRequest) {
  try {
    // Recebe dados da receita (JSON)
    const body = await request.json()
    const { nome, crm, texto } = body
    if (!nome || !crm || !texto) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, crm, texto' }, { status: 400 })
    }

    // Gera HTML real da receita
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Receita</title></head><body><h1>PRESCRIÇÃO MÉDICA</h1><p><b>Nome:</b> ${nome}</p><p><b>CRM:</b> ${crm}</p><div>${texto}</div></body></html>`
    const htmlPath = path.join('/tmp', `receita-${Date.now()}.html`)
    fs.writeFileSync(htmlPath, html)

    // Prepara form-data para Gotenberg
    const form = new FormData()
    form.append('files', fs.createReadStream(htmlPath), { filename: 'receita.html' })
    form.append('files', fs.createReadStream(CERT_PATH), { filename: 'certificado.p12' })
    form.append('password', CERT_PASSWORD)

    // Chama Gotenberg para converter e assinar
    const gotenbergResp = await axios.post(
      `${GOTENBERG_URL}/forms/libreoffice/convert`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Gotenberg-Pdf-Format': 'PDF/A-1a',
          'Gotenberg-Pdf-Sign': 'true',
        },
        responseType: 'arraybuffer',
        maxContentLength: 20 * 1024 * 1024, // 20MB
        maxBodyLength: 20 * 1024 * 1024,
      }
    )

    // Remove arquivo temporário
    fs.unlinkSync(htmlPath)

    // Retorna PDF assinado
    return new NextResponse(gotenbergResp.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receita-assinada.pdf"`,
      },
    })
  } catch (error: any) {
    // Remove arquivo temporário se existir
    if (error?.config?.data?._streams) {
      try { fs.unlinkSync(error.config.data._streams[1].path) } catch {}
    }
    const msg = error?.response?.data?.toString() || error?.message || 'Erro desconhecido'
    return NextResponse.json({ error: 'Falha ao assinar PDF via Gotenberg', details: msg }, { status: 500 })
  }
}
