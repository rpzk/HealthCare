import { medicalAI, SymptomAnalysisRequest } from './advanced-medical-ai'
import { incCounter } from './metrics'

interface Job { id: string; type: string; payload: SymptomAnalysisRequest; resolve: (v: unknown) => void; reject: (e: unknown) => void }

const queue: Job[] = []
let running = 0
const CONCURRENCY = 2

function next(){
  if (running >= CONCURRENCY) return
  const job = queue.shift()
  if (!job) return
  running++
  process(job).finally(()=>{ running--; next() })
}

async function process(job: Job){
  try {
    let result
    switch(job.type){
      case 'symptom_analysis': result = await medicalAI.analyzeSymptoms(job.payload); break
      default: throw new Error('Unknown job type')
    }
    incCounter('ai_queue_processed_total', { type: job.type })
    job.resolve(result)
  } catch(e){
    incCounter('ai_queue_failed_total', { type: job.type })
    job.reject(e)
  }
}

export function enqueue(type: string, payload: SymptomAnalysisRequest){
  return new Promise((resolve,reject)=>{
    queue.push({ id: Date.now()+':'+Math.random(), type, payload, resolve, reject })
    incCounter('ai_queue_jobs_total', { type })
    next()
  })
}
