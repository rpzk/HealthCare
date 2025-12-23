import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

let initialized = false

export function initTracing(){
  if (initialized || process.env.OTEL_TRACING_DISABLED === '1') return
  try {
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'healthcare-app',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      })
    })
    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    })
    provider.addSpanProcessor(new BatchSpanProcessor(exporter))
    provider.register()
    initialized = true
    console.log('[Tracing] OpenTelemetry inicializado')
  } catch(e){
    console.warn('[Tracing] Falha ao inicializar', (e as Error).message)
  }
}

const tracer = trace.getTracer('healthcare-app')

export function createSpan(name: string, attributes?: Record<string, any>) {
  return tracer.startSpan(name, {
    attributes: attributes || {},
  })
}

export async function traceAsync<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = createSpan(name, attributes)
  
  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span))
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    })
    span.recordException(error as Error)
    throw error
  } finally {
    span.end()
  }
}

export function traceSync<T>(
  name: string,
  fn: (span: Span) => T,
  attributes?: Record<string, any>
): T {
  const span = createSpan(name, attributes)
  
  try {
    const result = context.with(trace.setSpan(context.active(), span), () => fn(span))
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    })
    span.recordException(error as Error)
    throw error
  } finally {
    span.end()
  }
}

export function startSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return traceAsync(name, () => fn())
}

export function addEvent(name: string, attributes?: Record<string, any>) {
  const span = trace.getActiveSpan()
  if (span) {
    span.addEvent(name, attributes)
  }
}

export function setAttribute(key: string, value: any) {
  const span = trace.getActiveSpan()
  if (span) {
    span.setAttribute(key, value)
  }
}

export { trace, context }
