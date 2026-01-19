'use client'
import React from 'react'

export function DebugOverlay() {
  const [open,setOpen] = React.useState(false)
  const [info,setInfo] = React.useState<any>(null)
  React.useEffect(()=>{
    const params = new URLSearchParams(window.location.search)
    if(!params.get('debug')) return
    setOpen(true)
    function collect(){
      const data: any = {}
      // @ts-ignore
      data.__patients_raw = window.__PATIENTS_RAW || null
      // @ts-ignore
      data.__security_raw = window.__SECURITY_RAW || null
      // @ts-ignore
      data.__last_pages_stack = window.__LAST_PAGES_STACK || null
      setInfo(data)
    }
    collect()
    const id = setInterval(collect, 1500)
    return ()=> clearInterval(id)
  },[])
  if(!open) return null
  return (
    <div style={{position:'fixed',bottom:8,right:8,zIndex:9999,width:360,maxHeight:'60vh',overflow:'auto',background:'#111',color:'#0f0',fontSize:11,padding:8,border:'1px solid #333',borderRadius:6}}>
      <strong>DEBUG OVERLAY</strong>
      <pre>{info ? JSON.stringify(info,null,2) : 'Coletando dados...'}</pre>
    </div>
  )
}
