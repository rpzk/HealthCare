# External Data Adapters

Scaffolds for real-world external coding system and CBO integration.

## Pattern
Each adapter implements `ExternalFetchAdapter<T>` from `external-updates-service`:

```
interface ExternalFetchAdapter<T> {
  name: string
  sourceType: 'ICD10' | 'ICD11' | 'CIAP2' | 'NURSING' | 'CBO'
  fetchList(): Promise<T[]>
  mapRecord(r: T): { code: string; display: string; description?: string; parentCode?: string }
  version?(): Promise<string | undefined>
}
```

Use `version()` to return an authoritative version string (date, semantic version, publication code). If omitted, version grouping falls back to `null`.

## Included Scaffolds
- `icd10-who.ts` (JSON/CSV over HTTP placeholder)
- `icd11-who.ts`
- `ciap2.ts`
- `nursing.ts` (placeholder for nursing classification)
- `cbo-official.ts` (Brazilian CBO hierarchy ingestion)
  - You can download the official CBO file from: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads
  - Place the downloaded file in `uploads/external-cache` and set `CBO_LOCAL_PATH` to the full path, or pass the public URL via `CBO_XLSX_URL`.

## TODO / Enhancements
- Add network retry with exponential backoff.
- Cache raw downloads (disk or object storage) before parsing.
- Validate file checksums if upstream publishes hashes.
- Normalize accents for improved search mapping.
- Provide diff preview API prior to applying changes.

## Security Notes
- Sanitize and size‑limit remote payloads.
- Reject unexpectedly large files (> configured max MB).
- Consider signature / TLS pinning for critical medical sources.
