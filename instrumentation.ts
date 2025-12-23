// Global instrumentation with OpenTelemetry distributed tracing
export async function register() {
  // Guard against double registration
  if ((globalThis as any).__hcInstr) return
  ;(globalThis as any).__hcInstr = true

  const isNode = typeof process !== 'undefined' && typeof (process as any).on === 'function'
  const hasAddEvent = typeof (globalThis as any).addEventListener === 'function'

  try {
    if (isNode) {
      // Initialize OpenTelemetry tracing
      if (process.env.OTEL_ENABLED === 'true') {
        const { NodeSDK } = await import('@opentelemetry/sdk-trace-node')
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
        const { Resource } = await import('@opentelemetry/resources')
        const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions')

        const sdk = new NodeSDK({
          resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'healthcare-app',
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
          }),
          traceExporter: new OTLPTraceExporter({
            url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
          }),
          instrumentations: [getNodeAutoInstrumentations()],
        })

        sdk.start()
        // eslint-disable-next-line no-console
        console.log('[tracing] OpenTelemetry SDK initialized')

        process.on('SIGTERM', () => {
          sdk.shutdown()
            .then(() => console.log('[tracing] SDK shut down'))
            .catch((error) => console.error('[tracing] Shutdown error', error))
        })
      }

      // Error handlers
      process.on('unhandledRejection', (reason: any) => {
        // eslint-disable-next-line no-console
        console.error('[instr] UnhandledRejection:', reason?.message || reason, reason?.stack)
      })
      process.on('uncaughtException', (err: any) => {
        // eslint-disable-next-line no-console
        console.error('[instr] UncaughtException:', err?.message, err?.stack)
      })
      process.on('exit', (code: number) => {
        if (code !== 0) {
          // eslint-disable-next-line no-console
          console.error('[instr] Process exiting with code', code)
        }
      })
      // eslint-disable-next-line no-console
      console.log('[instr] Global instrumentation registered (node)')
      return
    }

    // Edge/Browser-like runtime
    if (hasAddEvent) {
      try {
        ;(globalThis as any).addEventListener('unhandledrejection', (event: any) => {
          // eslint-disable-next-line no-console
          console.error('[instr] UnhandledRejection (edge):', event?.reason?.message || event?.reason || event)
        })
      } catch {}
      try {
        ;(globalThis as any).addEventListener('error', (event: any) => {
          // eslint-disable-next-line no-console
          console.error('[instr] Error (edge):', event?.message || event)
        })
      } catch {}
      // eslint-disable-next-line no-console
      console.log('[instr] Global instrumentation registered (edge)')
      return
    }

    // Fallback: do nothing quietly
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[instr] Failed to register instrumentation:', (e as any)?.message)
  }
}

