# OpenTelemetry Tracing Setup

This document explains how to enable and use distributed tracing in the Healthcare application.

## Overview

The application now includes OpenTelemetry instrumentation for distributed tracing, allowing you to:
- Monitor request flows across the application
- Track performance bottlenecks
- Debug issues in production
- Visualize service dependencies

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Enable OpenTelemetry tracing
OTEL_ENABLED=true

# Service name for identification in traces
OTEL_SERVICE_NAME=healthcare-app

# OTLP endpoint (Jaeger, Zipkin, or other compatible backend)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Optional: Disable tracing completely
# OTEL_TRACING_DISABLED=1
```

### Default Configuration

- **Disabled by default**: Set `OTEL_ENABLED=true` to activate
- **Service name**: `healthcare-app` (customizable via `OTEL_SERVICE_NAME`)
- **Default endpoint**: `http://localhost:4318/v1/traces` (OTLP HTTP format)

## Setting Up a Tracing Backend

### Option 1: Jaeger (Recommended for Local Development)

Run Jaeger using Docker:

```bash
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Access Jaeger UI at: http://localhost:16686

### Option 2: Zipkin

```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

Update `.env`:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:9411/api/v2/spans
```

### Option 3: Production Services

For production, consider:
- **Honeycomb**: https://honeycomb.io
- **New Relic**: https://newrelic.com
- **Datadog**: https://datadoghq.com
- **Grafana Tempo**: https://grafana.com/oss/tempo/

## Using Tracing in Code

### Automatic Instrumentation

When `OTEL_ENABLED=true`, the following are automatically traced:
- HTTP requests (incoming and outgoing)
- Database queries (Prisma)
- External API calls
- Next.js routes

### Manual Instrumentation

Use the tracing utilities for custom spans:

```typescript
import { traceAsync, traceSync, addEvent, setAttribute } from '@/lib/tracing'

// Async function tracing
async function processPatientData(patientId: string) {
  return await traceAsync(
    'process-patient-data',
    async (span) => {
      span.setAttribute('patient.id', patientId)
      
      // Your logic here
      const patient = await fetchPatient(patientId)
      
      addEvent('patient-fetched', { id: patientId })
      
      return patient
    },
    { operation: 'patient-processing' }
  )
}

// Sync function tracing
function calculateRisk(data: any) {
  return traceSync(
    'calculate-risk',
    (span) => {
      span.setAttribute('data.type', typeof data)
      
      // Your calculation
      const risk = performCalculation(data)
      
      return risk
    }
  )
}

// Adding events to active span
addEvent('validation-started')
setAttribute('user.role', 'doctor')
```

### API Route Example

```typescript
// pages/api/patients/[id].ts
import { traceAsync } from '@/lib/tracing'

export default async function handler(req, res) {
  return await traceAsync(
    'api.patients.get',
    async (span) => {
      const { id } = req.query
      span.setAttribute('patient.id', id)
      
      const patient = await prisma.patient.findUnique({
        where: { id }
      })
      
      return res.json(patient)
    }
  )
}
```

## Docker Compose Integration

Add Jaeger to your `docker-compose.yml`:

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4318:4318"    # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - healthcare-network

  app:
    # ... your app config
    environment:
      - OTEL_ENABLED=true
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318/v1/traces
    depends_on:
      - jaeger
```

## Viewing Traces

1. Start your tracing backend (e.g., Jaeger)
2. Enable tracing in `.env`: `OTEL_ENABLED=true`
3. Restart your application
4. Generate some requests
5. View traces in the UI:
   - Jaeger: http://localhost:16686
   - Look for service: `healthcare-app`

## Performance Considerations

- **Sampling**: In production, consider sampling to reduce overhead
- **Batching**: Spans are batched automatically for efficiency
- **Overhead**: Minimal (<1% in most cases)

## Troubleshooting

### Traces not appearing?

1. Check `OTEL_ENABLED=true` in `.env`
2. Verify tracing backend is running: `curl http://localhost:4318/v1/traces`
3. Check application logs for `[Tracing] OpenTelemetry inicializado`
4. Ensure `OTEL_TRACING_DISABLED` is not set to `1`

### Connection errors?

- Verify `OTEL_EXPORTER_OTLP_ENDPOINT` URL is correct
- Check network connectivity to the backend
- Ensure the backend supports OTLP HTTP protocol

## Security Notes

- Tracing data may contain sensitive information
- Use authentication for production tracing backends
- Consider data retention policies
- Review traced attributes for PII/PHI data

## Additional Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
