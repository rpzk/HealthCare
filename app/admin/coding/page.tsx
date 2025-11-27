"use client"
import React, { useState, useEffect } from 'react'

interface CodeItem { 
  id: string
  code: string
  display: string
  description?: string | null
  chapter?: string | null
  isCategory?: boolean
  sexRestriction?: string | null
  crossAsterisk?: string | null
  shortDescription?: string | null
}

interface Chapter {
  code: string
  name: string
  count: number
}

export default function CodingAdminPage(){
  const [query, setQuery] = useState('')
  const [system, setSystem] = useState('CID10')
  const [results, setResults] = useState<CodeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [useFts, setUseFts] = useState(true)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapter, setSelectedChapter] = useState('')
  const [sexFilter, setSexFilter] = useState('')
  const [categoriesOnly, setCategoriesOnly] = useState(false)

  // Carregar capítulos quando sistema muda
  useEffect(() => {
    fetch(`/api/coding/chapters?system=${system}`)
      .then(r => r.json())
      .then(j => setChapters(j.chapters || []))
      .catch(() => setChapters([]))
  }, [system])

  async function doSearch(){
    if(!query.trim()) return
    setLoading(true); setError(null)
    try {
      let url = `/api/coding/search?query=${encodeURIComponent(query)}&system=${system}&limit=30`
      if (useFts) url += '&fts=1'
      if (selectedChapter) url += `&chapter=${selectedChapter}`
      if (sexFilter) url += `&sex=${sexFilter}`
      if (categoriesOnly) url += '&categories=1'
      
      const r = await fetch(url)
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

  useEffect(()=>{ if(query.length>2){ const h=setTimeout(()=>doSearch(),400); return ()=>clearTimeout(h) }},[query,system,useFts,selectedChapter,sexFilter,categoriesOnly])

  function getSexLabel(sex: string | null | undefined) {
    if (sex === 'M') return '♂ Masculino'
    if (sex === 'F') return '♀ Feminino'
    return null
  }

  function getCrossAsteriskLabel(ca: string | null | undefined) {
    if (ca === 'ETIOLOGY') return '✚ Etiologia'
    if (ca === 'MANIFESTATION') return '✱ Manifestação'
    return null
  }

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
      
      <div className="flex flex-col">
        <label className="text-sm font-medium">Capítulo</label>
        <select value={selectedChapter} onChange={e=>setSelectedChapter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          {chapters.map(ch => (
            <option key={ch.code} value={ch.code}>{ch.code} - {ch.name} ({ch.count})</option>
          ))}
        </select>
      </div>
      
      <div className="flex flex-col">
        <label className="text-sm font-medium">Sexo</label>
        <select value={sexFilter} onChange={e=>setSexFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </div>
      
      <div className="flex flex-col flex-1 min-w-[240px]">
        <label className="text-sm font-medium">Busca</label>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ex: diabetes, hipertensão..." className="border rounded px-2 py-1" />
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={useFts} onChange={e=>setUseFts(e.target.checked)} />
          FTS
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={categoriesOnly} onChange={e=>setCategoriesOnly(e.target.checked)} />
          Só Categorias
        </label>
      </div>
      
      <button onClick={doSearch} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={loading}>{loading?'Buscando...':'Buscar'}</button>
    </div>
    
    {error && <div className="text-red-600 text-sm">{error}</div>}
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="font-semibold mb-2">Resultados ({results.length})</h2>
        <ul className="divide-y border rounded max-h-[60vh] overflow-auto bg-white dark:bg-neutral-900">
          {results.map(r=> <li key={r.id} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer" onClick={()=>loadDetail(r.id)}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{r.code}</span>
              {r.isCategory && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">CAT</span>}
              {r.chapter && <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1 rounded">{r.chapter}</span>}
              {r.sexRestriction && <span className={`text-xs px-1 rounded ${r.sexRestriction === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                {r.sexRestriction === 'M' ? '♂' : '♀'}
              </span>}
            </div>
            <div className="font-medium">{r.display}</div>
            {r.shortDescription && r.shortDescription !== r.display && <div className="text-xs text-gray-500 dark:text-gray-400">{r.shortDescription}</div>}
          </li>)}
          {!results.length && <li className="p-4 text-sm text-gray-500">Nenhum resultado</li>}
        </ul>
      </div>
      
      <div>
        <h2 className="font-semibold mb-2">Detalhe</h2>
        {!detail && <div className="text-sm text-gray-500">Selecione um código…</div>}
        {detail && detail.error && <div className="text-red-600 text-sm">{detail.error}</div>}
        {detail && !detail.error && <div className="space-y-3 p-4 border rounded bg-white dark:bg-neutral-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{detail.code}</span>
              {detail.isCategory && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">Categoria</span>}
            </div>
            <div className="text-lg font-semibold mt-1">{detail.display}</div>
          </div>
          
          {detail.shortDescription && detail.shortDescription !== detail.display && (
            <div>
              <div className="text-xs uppercase text-gray-500 mb-1">Descrição Curta</div>
              <p className="text-sm">{detail.shortDescription}</p>
            </div>
          )}
          
          {detail.description && <p className="text-sm whitespace-pre-line">{detail.description}</p>}
          
          <div className="flex flex-wrap gap-2">
            {detail.chapter && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                Capítulo {detail.chapter}
              </span>
            )}
            {getSexLabel(detail.sexRestriction) && (
              <span className={`text-xs px-2 py-1 rounded ${detail.sexRestriction === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                {getSexLabel(detail.sexRestriction)}
              </span>
            )}
            {getCrossAsteriskLabel(detail.crossAsterisk) && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {getCrossAsteriskLabel(detail.crossAsterisk)}
              </span>
            )}
          </div>
          
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
