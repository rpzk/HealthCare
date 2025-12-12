"use client"
import React,{useEffect,useState, useCallback} from 'react'

interface CodeRef { id:string; code:string; display:string }
interface Diagnosis { id:string; status:string; certainty:string; createdAt:string; primaryCode: CodeRef; secondaryCodes: { code: CodeRef }[]; notes?:string|null }
interface Revision {
  id: string;
  changedAt: string;
  reason: string;
  previous: unknown;
  next: unknown;
}
interface Detail {
  id: string;
  revisions: Revision[];
}

export default function PatientDiagnosesPage({ params }: { params: { id:string } }) {
  const patientId = params.id
  const [items,setItems] = useState<Diagnosis[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState<string|null>(null)
  const [query,setQuery] = useState('')
  const [system,setSystem] = useState('CID10')
  const [searchResults,setSearchResults] = useState<CodeRef[]>([])
  const [primary,setPrimary] = useState<CodeRef|null>(null)
  const [secondary,setSecondary] = useState<CodeRef[]>([])
  const [notes,setNotes] = useState('')
  const [creating,setCreating] = useState(false)
  const [showForm,setShowForm] = useState(false)
  const [detail,setDetail] = useState<Detail|null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/diagnoses?patientId=${patientId}`)
      const j = await r.json(); if(!r.ok) throw new Error(j.error||'erro')
      setItems(j.diagnoses || [])
    } catch(e:unknown){ 
      if (e instanceof Error) {
        setError(e.message) 
      } else {
        setError('An unknown error occurred')
      }
    }
    finally { setLoading(false) }
  }, [patientId])

  useEffect(()=>{ load() },[load])

  useEffect(()=>{ // live search codes
    if(query.trim().length<3){ setSearchResults([]); return }
    const h = setTimeout(async ()=>{
      const r = await fetch(`/api/coding/search?query=${encodeURIComponent(query)}&system=${system}&limit=15`)
      const j = await r.json(); if(r.ok) setSearchResults(j.results||[])
    },400)
    return ()=>clearTimeout(h)
  },[query,system])

  async function createDiagnosis(){
    if(!primary) return
    setCreating(true)
    try {
      const body = { patientId, primaryCodeId: primary.id, secondaryCodeIds: secondary.map(s=>s.id), notes }
      const r = await fetch('/api/diagnoses',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json(); if(!r.ok) throw new Error(j.error||'erro')
      setPrimary(null); setSecondary([]); setNotes(''); setShowForm(false)
      load()
    } catch(e:unknown){ 
      if (e instanceof Error) {
        alert(e.message) 
      } else {
        alert('An unknown error occurred')
      }
    }
    finally { setCreating(false) }
  }

  async function loadDetail(id:string){
    const r = await fetch(`/api/diagnoses/revisions?diagnosisId=${id}`)
    const j = await r.json(); setDetail({ id, revisions: j.revisions||[] })
  }

  return <div className="p-6 space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-xl font-semibold">Diagnósticos</h1>
      <button onClick={()=>setShowForm(s=>!s)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">{showForm?'Cancelar':'Novo'}</button>
    </div>
    {showForm && <div className="border rounded p-4 space-y-3 bg-white">
      <div className="flex gap-2">
        <select value={system} onChange={e=>setSystem(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="CID10">CID-10</option>
          <option value="CID11">CID-11</option>
          <option value="CIAP2">CIAP-2</option>
          <option value="NURSING">Enfermagem</option>
        </select>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar código..." className="flex-1 border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {searchResults.map(r=> <button key={r.id} onClick={()=>{ if(!primary) setPrimary(r); else if(!secondary.find(s=>s.id===r.id) && r.id!==primary.id) setSecondary(s=>[...s,r]) }} className="border rounded px-2 py-1 hover:bg-gray-50">
          <span className="font-mono mr-1">{r.code}</span>{r.display}
        </button>)}
        {!searchResults.length && query.length>=3 && <span className="text-gray-400">Sem resultados</span>}
      </div>
      <div className="space-y-2">
        <div className="text-sm">
          <div className="font-semibold">Primário:</div>
          {primary ? <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1"><span className="font-mono">{primary.code}</span>{primary.display}<button onClick={()=>setPrimary(null)} className="text-red-600">x</button></div> : <span className="text-gray-400 text-xs">Selecione um código</span>}
        </div>
        <div className="text-sm">
          <div className="font-semibold">Secundários:</div>
          <div className="flex flex-wrap gap-2">
            {secondary.map(s=> <div key={s.id} className="flex items-center gap-1 text-xs bg-gray-100 border rounded px-2 py-1"><span className="font-mono">{s.code}</span><button onClick={()=>setSecondary(sec=>sec.filter(x=>x.id!==s.id))} className="text-red-600">x</button></div>)}
            {!secondary.length && <span className="text-gray-400 text-xs">Nenhum</span>}
          </div>
        </div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notas clínicas" className="w-full border rounded px-2 py-1 text-sm h-20" />
        <button disabled={!primary||creating} onClick={createDiagnosis} className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">{creating?'Salvando...':'Salvar'}</button>
      </div>
    </div>}

    {loading && <div className="text-sm text-gray-500">Carregando...</div>}
    {error && <div className="text-sm text-red-600">{error}</div>}

    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h2 className="font-semibold mb-2">Lista</h2>
        <ul className="divide-y border rounded bg-white max-h-[60vh] overflow-auto">
          {items.map(d=> <li key={d.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={()=>loadDetail(d.id)}>
            <div className="flex justify-between text-xs text-gray-500"><span>{new Date(d.createdAt).toLocaleDateString()}</span><span>{d.status}</span></div>
            <div className="text-sm font-medium"><span className="font-mono mr-1">{d.primaryCode.code}</span>{d.primaryCode.display}</div>
            {d.secondaryCodes.length>0 && <div className="text-[11px] text-gray-600 truncate">Sec: {d.secondaryCodes.map(sc=>sc.code.code).join(', ')}</div>}
            {d.notes && <div className="text-[11px] text-gray-500 line-clamp-2">{d.notes}</div>}
          </li>)}
          {!items.length && !loading && <li className="p-4 text-sm text-gray-500">Nenhum diagnóstico registrado</li>}
        </ul>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Revisões</h2>
        {!detail && <div className="text-sm text-gray-500">Selecione um diagnóstico para ver histórico.</div>}
        {detail && <div className="space-y-2 max-h-[60vh] overflow-auto border rounded bg-white p-3">
          <div className="text-xs text-gray-500">ID: {detail.id}</div>
          {detail.revisions.length===0 && <div className="text-xs text-gray-400">Sem revisões.</div>}
          {detail.revisions.map((r: Revision)=> <div key={r.id} className="border rounded p-2 text-xs space-y-1">
            <div className="flex justify-between"><span>{new Date(r.changedAt).toLocaleString()}</span><span>{r.reason||''}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-semibold">Anterior</div>
                <pre className="whitespace-pre-wrap break-all bg-gray-50 p-1 rounded max-h-32 overflow-auto">{JSON.stringify(r.previous,null,2)}</pre>
              </div>
              <div>
                <div className="font-semibold">Atual</div>
                <pre className="whitespace-pre-wrap break-all bg-gray-50 p-1 rounded max-h-32 overflow-auto">{JSON.stringify(r.next,null,2)}</pre>
              </div>
            </div>
          </div>)}
        </div>}
      </div>
    </div>
  </div>
}
