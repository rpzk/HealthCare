(async()=>{
  console.log('Teste export ZIP')
  const patientId = process.argv[2]
  if(!patientId){console.log('Uso: node test-export-zip.js <patientId>');return}
  const res = await fetch(`http://localhost:3000/api/patients/${patientId}/full-export`, { headers:{Accept:'application/zip'} })
  console.log('Status:', res.status, res.headers.get('x-integrity-sha256'))
  const buf = Buffer.from(await res.arrayBuffer())
  console.log('Tamanho zip bytes:', buf.length)
})()
