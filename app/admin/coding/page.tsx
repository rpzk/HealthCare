"use client"
import React, { useState, useEffect } from 'react'

interface CodeItem { id:string; code:string; display:string; description?:string|null }

export default function CodingAdminPage(){
  const [query,setQuery] = useState('')
  const [system,setSystem] = useState('CID10')
  const [results,setResults] = useState<CodeItem[]>([])
  const [loading,setLoading] = useState(false)
  const [detail,setDetail] = useState<any>(null)
  const [error,setError] = useState<string|null>(null)
  const [useFts,setUseFts] = useState(true)

  async function doSearch(){
    if(!query.trim()) return
    setLoading(true); setError(null)
    try {
      const r = await fetch(`/api/coding/search?query=${encodeURIComponent(query)}&system=${system}&limit=30${useFts?'&fts=1':''}`)
      const j = await r.json()
      if(!r.ok) throw new Error(j.error||'erro')
      setResults(j.results||[])
    } catch(e:any){ setError(e.message) }
    finally{ setLoading(false) }
  }
  async function loadDetail(id:string){
    setDetail(null)
    const r = await fetch(`/api/coding/code?id=${id}`)
    const j = await r.json()
    if(r.ok) setDetail(j); else setDetail({ error: j.error })
  }

  useEffect(()=>{ if(query.length>2){ const h=setTimeout(()=>doSearch(),400); return ()=>clearTimeout(h) }},[query,system,useFts])

  return <div className="p-6 space-y-6">
    <h1 className="text-2xl font-semibold">Sistemas de Codificação Clínica</h1>
    <div className="flex gap-2 items-end flex-wrap">
      <div className="flex flex-col">
        <label className="text-sm font-medium">Sistema</label>
        <select value={system} onChange={e=>setSystem(e.target.value)} className="border rounded px-2 py-1">
          <option value="CID10">CID-10</option>
          <option value="CID11">CID-11</option>
          <option value="CIAP2">CIAP-2</option>
          <option value="NURSING">Enfermagem</option>
        </select>
      </div>
      <div className="flex flex-col flex-1 min-w-[240px]">
        <label className="text-sm font-medium">Busca</label>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ex: diabetes" className="border rounded px-2 py-1" />
      </div>
      <div className="flex items-center gap-1 mt-4">
        <input type="checkbox" checked={useFts} onChange={e=>setUseFts(e.target.checked)} id="fts" />
        <label htmlFor="fts" className="text-sm">FTS</label>
      </div>
      <button onClick={doSearch} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading}>{loading?'Buscando...':'Buscar'}</button>
    </div>
    {error && <div className="text-red-600 text-sm">{error}</div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="font-semibold mb-2">Resultados ({results.length})</h2>
        <ul className="divide-y border rounded max-h-[60vh] overflow-auto bg-white">
          {results.map(r=> <li key={r.id} className="p-2 hover:bg-gray-50 cursor-pointer" onClick={()=>loadDetail(r.id)}>
            <div className="font-mono text-xs text-gray-600">{r.code}</div>
            <div className="font-medium">{r.display}</div>
            {r.description && <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>}
          </li>)}
          {!results.length && <li className="p-4 text-sm text-gray-500">Nenhum resultado</li>}
        </ul>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Detalhe</h2>
        {!detail && <div className="text-sm text-gray-500">Selecione um código…</div>}
        {detail && detail.error && <div className="text-red-600 text-sm">{detail.error}</div>}
        {detail && !detail.error && <div className="space-y-3">
          <div>
            <div className="font-mono text-xs">{detail.code}</div>
            <div className="text-lg font-semibold">{detail.display}</div>
          </div>
          {detail.description && <p className="text-sm whitespace-pre-line">{detail.description}</p>}
          {detail.hierarchyPath?.length>0 && <div>
            <div className="text-xs uppercase text-gray-500 mb-1">Hierarquia</div>
            <ol className="text-xs space-y-1 list-decimal ml-4">
              {detail.hierarchyPath.map((h:any)=> <li key={h.id}><span className="font-mono mr-1">{h.code}</span>{h.display}</li>)}
            </ol>
          </div>}
        </div>}
      </div>
    </div>
  </div>
}
