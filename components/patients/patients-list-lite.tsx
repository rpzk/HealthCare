'use client'
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Patient { id: string; name: string }

export function PatientsListLite() {
  const router = useRouter()
  const [data,setData] = React.useState<Patient[]>([])
  const [loading,setLoading] = React.useState(true)
  const [error,setError] = React.useState<string|null>(null)
  const [meta,setMeta] = React.useState<any>(null)

  React.useEffect(() => {
    let cancelled=false
    async function run(){
      try{
        const res = await fetch('/api/patients?page=1&limit=5', { cache: 'no-store' })
        const json = await res.json().catch(()=>null)
        if(cancelled) return
        if(json && Array.isArray(json.patients)) {
          setData(json.patients.map((p:any)=>({ id:p.id, name:p.name })))
          setMeta(json.pagination || { total: json.total, pages: json.totalPages, page: json.currentPage })
        } else {
          setError('Formato inesperado')
        }
      } catch(e:any){
        console.error('[PatientsListLite] error', e)
        setError(e.message)
      } finally { if(!cancelled) setLoading(false) }
    }
    run()
    return ()=>{cancelled=true}
  },[])

  if(loading) return <div className='text-sm text-gray-500'>Carregando pacientes...</div>
  if(error) return <div className='text-sm text-red-600'>Erro: {error}</div>
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pacientes</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className='text-sm text-gray-500'>Nenhum paciente.</div>
        ) : (
          <ul className='list-disc pl-5 text-sm space-y-1'>
            {data.map(p=> <li key={p.id}>{p.name||'(sem nome)'}</li>)}
          </ul>
        )}
        <div className='mt-4'>
          <Button variant="outline" onClick={() => router.push('/patients')}>Ver todos</Button>
        </div>
      </CardContent>
    </Card>
  )
}
