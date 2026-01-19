import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { trace } from '@opentelemetry/api'

let initialized = false

export function initTracing(){
  if (initialized || process.env.OTEL_TRACING_DISABLED === '1') return
  try {
    const provider = new NodeTracerProvider()
    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    })
    provider.addSpanProcessor(new BatchSpanProcessor(exporter))
    provider.register()
    initialized = true
    console.log('[Tracing] OpenTelemetry inicializado')
  } catch(e){
    console.warn('[Tracing] Falha ao inicializar', (e as any).message)
  }
}

export function startSpan(name: string, fn: () => Promise<any>) {
  const tracer = trace.getTracer('healthcare-app')
  const span = tracer.startSpan(name)
  return Promise.resolve(fn())
    .then(res => { span.end(); return res })
    .catch(err => { span.recordException(err as any); span.end(); throw err })
}
