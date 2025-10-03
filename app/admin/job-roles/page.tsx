"use client"
import React, { useEffect, useState } from 'react'

interface JobRole { id:string; title:string; requiredMinStratum:string; requiredMaxStratum?:string; occupationId?:string }

async function createRole(data:any){
  const r = await fetch('/api/job-roles/create',{ method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(data) });
  return await r.json()
}
async function fetchMatches(userId:string){ const r = await fetch(`/api/capability/match-detailed/${userId}`); return (await r.json()).roles }

export default function JobRolesAdminPage(){
  const [form,setForm] = useState({ title:'', occupationCode:'', requiredMinStratum:'S1', requiredMaxStratum:'', description:'', tasks:'', capabilitiesText:'' })
  const [creating,setCreating] = useState(false)
  const [userId,setUserId] = useState('')
  const [matches,setMatches] = useState<any[]>([])
  const [msg,setMsg] = useState('')

  async function submit(e:React.FormEvent){ e.preventDefault(); setCreating(true); setMsg('Criando...')
    let capabilities: Record<string,number>|undefined
    if(form.capabilitiesText.trim()){
      try { capabilities = JSON.parse(form.capabilitiesText) } catch { setMsg('JSON inválido em capabilities'); setCreating(false); return }
    }
    const payload:any = { title: form.title, occupationCode: form.occupationCode || undefined, requiredMinStratum: form.requiredMinStratum, description: form.description||undefined, tasks: form.tasks||undefined, capabilities }
    if(form.requiredMaxStratum) payload.requiredMaxStratum = form.requiredMaxStratum
    const res = await createRole(payload)
    if(res.role){ setMsg('Role criada'); setForm({ title:'', occupationCode:'', requiredMinStratum:'S1', requiredMaxStratum:'', description:'', tasks:'', capabilitiesText:'' }) }
    else setMsg('Falha ao criar role')
    setCreating(false)
  }

  async function loadMatches(){ if(!userId) return; setMsg('Carregando matches...'); setMatches(await fetchMatches(userId)); setMsg('Matches atualizados') }

  return <div className="p-6 space-y-6">
    <h1 className="text-2xl font-semibold">Admin: Job Roles & Matching</h1>
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={submit} className="space-y-2 border rounded p-4">
        <h2 className="font-medium">Criar Job Role</h2>
        <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título" className="w-full border rounded px-2 py-1" />
        <input value={form.occupationCode} onChange={e=>setForm(f=>({...f,occupationCode:e.target.value}))} placeholder="Código Ocupação (opcional)" className="w-full border rounded px-2 py-1" />
        <div className="flex gap-2">
          <select value={form.requiredMinStratum} onChange={e=>setForm(f=>({...f,requiredMinStratum:e.target.value}))} className="border rounded px-2 py-1">
            {['S1','S2','S3','S4','S5','S6','S7','S8'].map(s=> <option key={s}>{s}</option>)}
          </select>
          <select value={form.requiredMaxStratum} onChange={e=>setForm(f=>({...f,requiredMaxStratum:e.target.value}))} className="border rounded px-2 py-1">
            <option value="">(max opcional)</option>
            {['S1','S2','S3','S4','S5','S6','S7','S8'].map(s=> <option key={s}>{s}</option>)}
          </select>
        </div>
        <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descrição" className="w-full border rounded px-2 py-1 h-20" />
        <textarea value={form.tasks} onChange={e=>setForm(f=>({...f,tasks:e.target.value}))} placeholder="Tarefas (markdown)" className="w-full border rounded px-2 py-1 h-24" />
        <textarea value={form.capabilitiesText} onChange={e=>setForm(f=>({...f,capabilitiesText:e.target.value}))} placeholder='Capabilities JSON ex: {"decisao":0.7,"complexidade":0.5}' className="w-full border rounded px-2 py-1 h-24 font-mono text-xs" />
        <button disabled={creating} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">{creating? 'Criando...' : 'Criar Role'}</button>
        {msg && <div className="text-xs text-neutral-600 dark:text-neutral-400">{msg}</div>}
      </form>
      <div className="space-y-3">
        <div className="border rounded p-4 space-y-2">
          <h2 className="font-medium">Matching de Usuário</h2>
          <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="User ID" className="w-full border rounded px-2 py-1" />
          <button type="button" onClick={loadMatches} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Carregar Matches</button>
          <div className="max-h-80 overflow-auto divide-y text-sm border rounded">
            {matches.map(m=> <div key={m.id} className="p-2 flex justify-between"><span>{m.title}</span><span className="font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-1 rounded">{(m._fitScore||0).toFixed(2)}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  </div>
}