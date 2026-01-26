// Módulo simples de métricas estilo Prometheus (in-memory)
// NÃO usar em produção sem persistência/cluster awareness
// Métricas adicionais esperadas (emitidas em outros módulos):
// - patient_full_export_total{format="json|zip"}
// - patient_full_export_duration_ms (histogram)

import { logger } from '@/lib/logger'

type CounterKey = string
type HistogramKey = string

interface Counter { value: number }
interface Histogram { buckets: number[]; counts: number[]; sum: number; count: number }
interface Gauge { value: number }

const counters: Record<CounterKey, Counter> = {}
const histograms: Record<HistogramKey, Histogram> = {}
const gauges: Record<string, Gauge> = {}

function sanitize(v: string) {
  return v.replace(/[^a-zA-Z0-9_:/-]/g, '_')
}

export function incCounter(name: string, labels: Record<string,string> = {}, value: number = 1) {
  const key = buildKey(name, labels)
  if (!counters[key]) counters[key] = { value: 0 }
  counters[key].value += value
}

export function setGauge(name: string, value: number, labels: Record<string,string> = {}) {
  const key = buildKey(name, labels)
  if (!gauges[key]) gauges[key] = { value }
  gauges[key].value = value
}

export function observeHistogram(name: string, ms: number, labels: Record<string,string> = {}, buckets: number[] = [5,10,25,50,100,250,500,1000,2000,5000]) {
  const key = buildKey(name, labels)
  if (!histograms[key]) histograms[key] = { buckets, counts: new Array(buckets.length).fill(0), sum: 0, count: 0 }
  const h = histograms[key]
  for (let i=0;i<h.buckets.length;i++) {
    if (ms <= h.buckets[i]) { h.counts[i]++; break }
  }
  h.sum += ms
  h.count++
}

function buildKey(name: string, labels: Record<string,string>) {
  const base = sanitize(name)
  const lbl = Object.keys(labels).sort().map(k=>`${sanitize(k)}=${sanitize(labels[k])}`).join(',')
  return lbl ? `${base}{${lbl}}` : base
}

export function recordRequest(path: string, method: string, status: number, durationMs: number) {
  const normPath = path
    .replace(/\b[0-9a-fA-F]{24}\b/g,'{id}')
    .replace(/\/[0-9]+(?![a-zA-Z0-9])/g,'/{id}')
  const labels = { path: normPath, method: method.toUpperCase(), status: String(status) }
  incCounter('api_request_total', labels)
  observeHistogram('api_request_duration_ms', durationMs, { path: normPath, method: method.toUpperCase() })
}

export async function renderPrometheus(prisma?: { auditLog?: { count: () => Promise<number> } }) {
  const out: string[] = []
  out.push('# HELP api_request_total Total de requisições API por path/método/status')
  out.push('# TYPE api_request_total counter')
  for (const k of Object.keys(counters)) {
    out.push(`${k} ${counters[k].value}`)
  }
  out.push('\n# HELP api_request_duration_ms Duração de requisições em ms (histogram)')
  out.push('# TYPE api_request_duration_ms histogram')
  for (const k of Object.keys(histograms)) {
    const h = histograms[k]
    const base = k.split('{')[0]
    const labelPart = k.includes('{') ? k.substring(k.indexOf('{')).replace(/}$/,'') : ''
    let cumulative = 0
    for (let i=0;i<h.buckets.length;i++) {
      cumulative += h.counts[i]
      out.push(`${base}_bucket${labelPart ? labelPart+',' : '{'}le="${h.buckets[i]}"} ${cumulative}`)
    }
    out.push(`${base}_bucket${labelPart ? labelPart+',' : '{'}le="+Inf"} ${h.count}`)
    out.push(`${base}_sum${labelPart ? labelPart : ''} ${h.sum}`)
    out.push(`${base}_count${labelPart ? labelPart : ''} ${h.count}`)
  }

  // Contagem de audit logs (gauge)
  if (prisma?.auditLog?.count) {
    try {
      const total = await prisma.auditLog.count()
      out.push('\n# HELP audit_logs_total Total de audit logs')
      out.push('# TYPE audit_logs_total gauge')
      out.push(`audit_logs_total ${total}`)
    } catch (e) {
      // don't fail rendering metrics if audit log query fails - log at debug level
      // keeps the catch from being an empty block (ESLint no-empty)
      // eslint-disable-next-line no-console
      logger.debug('renderPrometheus: unable to count audit logs', e)
    }
  }

  if (Object.keys(gauges).length) {
    out.push('\n# HELP runtime_gauge Valores de gauges dinâmicos')
    out.push('# TYPE runtime_gauge gauge')
    for (const k of Object.keys(gauges)) {
      out.push(`${k} ${gauges[k].value}`)
    }
  }

  return out.join('\n') + '\n'
}
