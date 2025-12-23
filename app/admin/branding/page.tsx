"use client"
import { useEffect, useState } from 'react'

export default function BrandingAdminPage() {
  const [clinicName, setClinicName] = useState('')
  const [footerText, setFooterText] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined)
  const [headerUrl, setHeaderUrl] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/branding')
      .then((r) => r.json())
      .then((b) => {
        setClinicName(b?.clinicName || '')
        setFooterText(b?.footerText || '')
        setLogoUrl(b?.logoUrl)
        setHeaderUrl(b?.headerUrl)
      })
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/branding', { method: 'POST', body: formData })
    const data = await res.json()
    setClinicName(data?.clinicName || '')
    setFooterText(data?.footerText || '')
    setLogoUrl(data?.logoUrl)
    setHeaderUrl(data?.headerUrl)
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Branding da Clínica</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Nome da Clínica</label>
          <input name="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="mt-1 w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Rodapé do PDF</label>
          <textarea name="footerText" value={footerText} onChange={(e) => setFooterText(e.target.value)} className="mt-1 w-full border rounded p-2" rows={3} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Logo (imagem)</label>
            <input name="logo" type="file" accept="image/*" className="mt-1 w-full" />
            {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 h-16 object-contain" />}
          </div>
          <div>
            <label className="block text-sm font-medium">Imagem de Cabeçalho</label>
            <input name="headerImage" type="file" accept="image/*" className="mt-1 w-full" />
            {headerUrl && <img src={headerUrl} alt="Cabeçalho" className="mt-2 h-16 object-cover" />}
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
      </form>
    </div>
  )
}
