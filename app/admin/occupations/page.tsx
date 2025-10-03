"use client"
import React, { useEffect, useState } from 'react'

interface CBOGroupNode { id:string; code:string; name:string; level:number; children?:CBOGroupNode[] }
interface Occupation { id:string; code:string; title:string }

async function fetchTree(depth=3){
  const r = await fetch(`/api/occupations/groups/tree?depth=${depth}`)
  return (await r.json()).tree as CBOGroupNode[]
}
async function searchOccupations(q:string){
  const r = await fetch(`/api/occupations/search?q=${encodeURIComponent(q)}`)
  return (await r.json()).results as Occupation[]
}

export default function OccupationsAdminPage(){
  const [tree,setTree] = useState<CBOGroupNode[]>([])
  const [q,setQ] = useState('')
  const [results,setResults] = useState<Occupation[]>([])
  const [loading,setLoading] = useState(false)
  const [groupForm,setGroupForm] = useState({ code:'', name:'', level:1, parentCode:'' })
  const [occForm,setOccForm] = useState({ code:'', title:'', groupCode:'', description:'' })
  const [message,setMessage] = useState('')

  useEffect(()=>{ fetchTree().then(setTree) },[])
  useEffect(()=>{ let active=true; if(q.trim().length){ setLoading(true); searchOccupations(q).then(r=>{ if(active){ setResults(r); setLoading(false) } }) } else { setResults([]) } return ()=>{ active=false } },[q])

  async function submitGroup(e:React.FormEvent){ e.preventDefault(); setMessage('Salvando grupo...')
    const r = await fetch('/api/occupations/groups/upsert',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(groupForm) })
    if(r.ok){ setMessage('Grupo salvo'); setGroupForm({ code:'', name:'', level:1, parentCode:'' }); setTree(await fetchTree()) } else setMessage('Erro ao salvar grupo') }
  async function submitOcc(e:React.FormEvent){ e.preventDefault(); setMessage('Salvando ocupação...')
    const r = await fetch('/api/occupations/upsert',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(occForm) })
    if(r.ok){ setMessage('Ocupação salva'); setOccForm({ code:'', title:'', groupCode:'', description:'' }); if(q) setResults(await searchOccupations(q)) } else setMessage('Erro ao salvar ocupação') }

  function renderTree(nodes:CBOGroupNode[], depth=0){ return <ul className="ml-2 border-l border-neutral-300 dark:border-neutral-700 pl-2">
    {nodes.map(n=> <li key={n.id} className="mb-1">
      <div className="text-sm"><span className="font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-1 rounded">{n.code}</span> {n.name}</div>
      {n.children?.length ? renderTree(n.children, depth+1) : null}
    </li>)}
  </ul> }

  return <div className="p-6 space-y-6">
    <h1 className="text-2xl font-semibold">Admin: Ocupações & CBO</h1>
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar ocupações..." className="w-full border rounded px-2 py-1 bg-background" />
          {loading && <div className="text-xs text-neutral-500 mt-1">Buscando...</div>}
          {results.length>0 && <div className="mt-2 border rounded divide-y max-h-72 overflow-auto">
            {results.map(o=> <div key={o.id} className="p-2 text-sm flex justify-between"><span><span className="font-mono bg-neutral-200 dark:bg-neutral-700 px-1 rounded mr-1">{o.code}</span>{o.title}</span></div>)}
          </div>}
        </div>
        <div>
          <h2 className="font-medium mb-2">Árvore de Grupos (CBO)</h2>
          <div className="max-h-96 overflow-auto text-sm">{renderTree(tree)}</div>
        </div>
      </div>
      <div className="space-y-6">
        <form onSubmit={submitGroup} className="space-y-2 border rounded p-3">
          <h3 className="font-medium">Novo / Editar Grupo</h3>
          <input required value={groupForm.code} onChange={e=>setGroupForm(f=>({...f,code:e.target.value}))} placeholder="Código" className="w-full border rounded px-2 py-1" />
          <input required value={groupForm.name} onChange={e=>setGroupForm(f=>({...f,name:e.target.value}))} placeholder="Nome" className="w-full border rounded px-2 py-1" />
          <input type="number" min={1} max={4} value={groupForm.level} onChange={e=>setGroupForm(f=>({...f,level:parseInt(e.target.value||'1')}))} className="w-full border rounded px-2 py-1" />
            <input value={groupForm.parentCode} onChange={e=>setGroupForm(f=>({...f,parentCode:e.target.value}))} placeholder="Parent code (opcional)" className="w-full border rounded px-2 py-1" />
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Salvar Grupo</button>
        </form>
        <form onSubmit={submitOcc} className="space-y-2 border rounded p-3">
          <h3 className="font-medium">Nova / Editar Ocupação</h3>
          <input required value={occForm.code} onChange={e=>setOccForm(f=>({...f,code:e.target.value}))} placeholder="Código" className="w-full border rounded px-2 py-1" />
          <input required value={occForm.title} onChange={e=>setOccForm(f=>({...f,title:e.target.value}))} placeholder="Título" className="w-full border rounded px-2 py-1" />
          <input value={occForm.groupCode} onChange={e=>setOccForm(f=>({...f,groupCode:e.target.value}))} placeholder="Group code" className="w-full border rounded px-2 py-1" />
          <textarea value={occForm.description} onChange={e=>setOccForm(f=>({...f,description:e.target.value}))} placeholder="Descrição" className="w-full border rounded px-2 py-1 h-24" />
          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Salvar Ocupação</button>
        </form>
        {message && <div className="text-xs text-neutral-600 dark:text-neutral-400">{message}</div>}
      </div>
    </div>
  </div>
}