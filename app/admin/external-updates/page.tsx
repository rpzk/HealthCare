"use client"
import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url:string, init?:RequestInit) => fetch(url, init).then(r=>r.json())

export default function ExternalUpdatesAdminPage() {
  const { data, mutate, isLoading } = useSWR('/api/admin/external-updates/history', fetcher, { refreshInterval: 10000 })
  const [running, setRunning] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [lastResult, setLastResult] = useState<any>(null)
  const [retireMissing, setRetireMissing] = useState(false)
  const [preview, setPreview] = useState(false)
  const [source, setSource] = useState('ICD10')
  const [file, setFile] = useState<File|undefined>()
  const [uploading, setUploading] = useState(false)

  async function runUpdate() {
    setRunning(true)
    try {
  const res = await fetch('/api/admin/external-updates/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun, retireMissing, preview, source }) })
      const json = await res.json()
      setLastResult(json)
      mutate()
    } finally {
      setRunning(false)
    }
  }

  async function uploadFileAndRun() {
    if (!file) return alert('Selecione um arquivo primeiro')
    setUploading(true)
    try {
      const buf = await file.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      const res = await fetch('/api/admin/external-updates/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, filename: file.name, contentBase64: b64, dryRun, retireMissing, preview }) })
      const json = await res.json()
      setLastResult(json)
      mutate()
    } finally { setUploading(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">External Data Updates</h1>
      <div className="flex items-center gap-4">
        <select value={source} onChange={e=> setSource(e.target.value)} className="border rounded px-2 py-1">
          <option value="ICD10">ICD10</option>
          <option value="ICD11">ICD11</option>
          <option value="CIAP2">CIAP2</option>
          <option value="NURSING">NURSING</option>
          <option value="CBO">CBO</option>
        </select>
        <label className="flex items-center gap-2"><input type="checkbox" checked={dryRun} onChange={e=> setDryRun(e.target.checked)} /> Dry Run</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={retireMissing} onChange={e=> setRetireMissing(e.target.checked)} /> Retire Missing</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={preview} onChange={e=> setPreview(e.target.checked)} /> Preview</label>
        <button disabled={running} onClick={runUpdate} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">{running ? 'Running...' : 'Run Mock ICD10 Update'}</button>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <input type="file" onChange={e=> setFile(e?.target?.files?.[0])} />
        <button disabled={!file || uploading} onClick={uploadFileAndRun} className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload & Run'}</button>
      </div>
      {lastResult && (
        <pre className="bg-gray-900 text-green-200 text-sm p-4 rounded overflow-auto max-h-72">{JSON.stringify(lastResult, null, 2)}</pre>
      )}
      <section>
        <h2 className="text-xl font-medium mb-2">Recent Runs</h2>
        {isLoading && <p>Loading...</p>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Started</th>
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">Version</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Fetched</th>
                <th className="p-2 text-left">Inserted</th>
                <th className="p-2 text-left">Updated</th>
                <th className="p-2 text-left">Skipped</th>
                <th className="p-2 text-left">Retired</th>
                <th className="p-2 text-left">Checksum</th>
              </tr>
            </thead>
            <tbody>
              {data?.history?.map((h:any) => (
                <tr key={h.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{new Date(h.startedAt).toLocaleString()}</td>
                  <td className="p-2">{h.sourceType}</td>
                  <td className="p-2">{h.versionTag || '-'}</td>
                  <td className="p-2">{h.status}</td>
                  <td className="p-2">{h.fetchedCount ?? '-'}</td>
                  <td className="p-2">{h.insertedCount ?? '-'}</td>
                  <td className="p-2">{h.updatedCount ?? '-'}</td>
                  <td className="p-2">{h.skippedCount ?? '-'}</td>
                  <td className="p-2">{h.retiredCount ?? '-'}</td>
                  <td className="p-2 font-mono text-xs max-w-[140px] truncate" title={h.checksum}>{h.checksum?.slice(0,12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
