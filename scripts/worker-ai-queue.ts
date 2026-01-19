import { aiQueue } from '@/lib/ai-bullmq-queue'
console.log('Worker BullMQ ativo - aguardando jobs IA')
aiQueue.waitUntilReady().then(()=>console.log('Queue pronta'))
