"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  roomId: string
  userId: string
}

export default function TeleRoom({ roomId, userId }: Props){
  const clientId = useMemo(()=> `${userId}-${Math.random().toString(36).slice(2,9)}`,[userId])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localRef = useRef<HTMLVideoElement | null>(null)
  const remoteRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [joined, setJoined] = useState(false)
  const [mute, setMute] = useState(false)
  const [cam, setCam] = useState(true)

  const [iceServers, setIceServers] = useState<any[]>([{ urls: 'stun:stun.l.google.com:19302' }])
  useEffect(()=>{ (async()=>{
    try {
      const res = await fetch('/api/tele/config')
      const json = await res.json().catch(()=>null)
      if (json?.iceServers) setIceServers(json.iceServers)
    } catch {}
  })() },[])

  useEffect(()=>{
    return ()=>{
      try { pcRef.current?.getSenders().forEach(s=>s.track?.stop()) } catch {}
      try { pcRef.current?.close() } catch {}
    }
  },[])

  async function join(){
    setStatus('preparing')
    const pc = new RTCPeerConnection({ iceServers })
    pcRef.current = pc
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    ms.getTracks().forEach(t=> pc.addTrack(t, ms))
    if (localRef.current) localRef.current.srcObject = ms
    pc.ontrack = (ev)=>{
      if (remoteRef.current) remoteRef.current.srcObject = ev.streams[0]
    }
    pc.onconnectionstatechange = ()=> setStatus(pc.connectionState)

    // Signaling
    const es = new EventSource(`/api/tele/rooms/${roomId}/events?clientId=${encodeURIComponent(clientId)}`)
    es.addEventListener('signal', async (ev:any)=>{
      const data = JSON.parse(ev.data)
      if (data.type === 'offer'){
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await fetch(`/api/tele/rooms/${roomId}/signal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'answer', sdp: answer.sdp, from: clientId }) })
      } else if (data.type === 'answer'){
        if (!pc.currentRemoteDescription) await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
      } else if (data.type === 'candidate' && data.candidate){
        try { await pc.addIceCandidate(data.candidate) } catch {}
      }
    })
    es.addEventListener('error', ()=>{})

    pc.onicecandidate = (ev)=>{
      if (ev.candidate){
        fetch(`/api/tele/rooms/${roomId}/signal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'candidate', candidate: ev.candidate, from: clientId }) })
      }
    }

    // Make an offer (first peer to click join creates an offer)
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
    await pc.setLocalDescription(offer)
    await fetch(`/api/tele/rooms/${roomId}/signal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'offer', sdp: offer.sdp, from: clientId }) })

    setJoined(true)
    setStatus('connecting')
  }

  function toggleMute(){
    const stream = localRef.current?.srcObject as MediaStream | null
    stream?.getAudioTracks().forEach(t=> t.enabled = !t.enabled)
    setMute(m => !m)
  }
  function toggleCam(){
    const stream = localRef.current?.srcObject as MediaStream | null
    stream?.getVideoTracks().forEach(t=> t.enabled = !t.enabled)
    setCam(c => !c)
  }
  async function shareScreen(){
    try {
      const pc = pcRef.current
      if (!pc) return
      // @ts-ignore
      const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false })
      const track = ds.getVideoTracks()[0]
      const sender = pc.getSenders().find(s=> s.track && s.track.kind==='video')
      if (sender && track) sender.replaceTrack(track)
      track.onended = () => {
        // revert to camera
        const stream = localRef.current?.srcObject as MediaStream | null
        const camTrack = stream?.getVideoTracks()[0]
        if (sender && camTrack) sender.replaceTrack(camTrack)
      }
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-300">Sala: {roomId} • Estado: {status}</div>
        {!joined ? (
          <button className="px-3 py-2 rounded bg-teal-600 hover:bg-teal-500 text-white text-sm" onClick={join}>Entrar</button>
        ) : (
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded bg-gray-700 text-white text-sm" onClick={toggleMute}>{mute? 'Desmutar': 'Mutar'}</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white text-sm" onClick={toggleCam}>{cam? 'Desligar Câmera': 'Ligar Câmera'}</button>
            <button className="px-3 py-2 rounded bg-gray-700 text-white text-sm" onClick={shareScreen}>Compartilhar Tela</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <video ref={localRef} className="w-full rounded bg-black" autoPlay muted playsInline />
        <video ref={remoteRef} className="w-full rounded bg-black" autoPlay playsInline />
      </div>
      <div className="text-xs text-gray-500">
        Dica: ambos usuários precisam clicar em "Entrar" para iniciar a chamada.
      </div>
    </div>
  )
}
