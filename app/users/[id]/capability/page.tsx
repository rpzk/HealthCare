"use client"
import React, { useEffect, useState } from 'react'

interface Evaluation { id:string; stratumAssessed:string; potentialStratum?:string; createdAt:string; timeSpanMonths?:number }
interface Match {
  id: string;
  title: string;
  requiredMinStratum: string;
  requiredMaxStratum?: string;
  _fitScore?: number;
  _fitState?: 'FLOW' | 'BOREDOM' | 'OVERLOAD';
  _stratumGap?: number;
}

async function fetchEvaluations(id:string){ const r = await fetch(`/api/capability/user/${id}/evaluations`); return (await r.json()).evaluations as Evaluation[] }
async function fetchMatches(id:string){ const r = await fetch(`/api/capability/match-detailed/${id}`); return (await r.json()).roles as Match[] }

export default function UserCapabilityPage({ params }: { params: { id: string } }){
  const userId = params.id
  const [evals,setEvals] = useState<Evaluation[]>([])
  const [matches,setMatches] = useState<Match[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{ let active=true; (async()=>{
    const [e,m] = await Promise.all([fetchEvaluations(userId), fetchMatches(userId)])
    if(!active) return
    setEvals(e); setMatches(m); setLoading(false)
  })(); return ()=>{ active=false } },[userId])

  if(loading) return <div className="p-6">Carregando...</div>
  return <div className="p-6 space-y-6">
    <h1 className="text-xl font-semibold">Capability - Usuário {userId}</h1>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <h2 className="font-medium">Histórico de Avaliações</h2>
        <div className="border rounded divide-y max-h-96 overflow-auto text-sm">
          {evals.map(ev=> <div key={ev.id} className="p-2 flex flex-col gap-1">
            <div className="flex justify-between"><span className="font-mono text-xs bg-neutral-200 dark:bg-neutral-700 px-1 rounded">{ev.stratumAssessed}</span><span className="text-xs text-neutral-500">{new Date(ev.createdAt).toLocaleDateString()}</span></div>
            {ev.potentialStratum && <div className="text-xs">Potencial: <span className="font-semibold">{ev.potentialStratum}</span></div>}
            {ev.timeSpanMonths && <div className="text-xs">Time Span: {ev.timeSpanMonths}m</div>}
          </div>)}
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-medium">Matches (Roles)</h2>
        <div className="border rounded divide-y max-h-96 overflow-auto text-sm">
          {matches.map(m=> <div key={m.id} className="p-2 flex justify-between items-center">
            <div>
              <div className="font-medium text-sm">{m.title}</div>
              <div className="text-xs text-neutral-500">Req: {m.requiredMinStratum}{m.requiredMaxStratum?`-${m.requiredMaxStratum}`:''}</div>
              {m._fitState && (
                <div className="text-xs text-neutral-500">
                  Fit: {m._fitState}{typeof m._stratumGap === 'number' && m._stratumGap > 0 ? ` (Δ ${m._stratumGap})` : ''}
                </div>
              )}
            </div>
            <span className="font-mono text-xs bg-blue-600 text-white px-1 rounded">{(m._fitScore||0).toFixed(2)}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>
}