#!/usr/bin/env tsx
import { icd11WhoRealAdapter } from '../lib/adapters/icd11-who-real'

async function main() {
  console.log('ICD-11 WHO adapter run (this will use environment variables ICD11_CLIENT_ID / ICD11_CLIENT_SECRET)')
  try {
    const version = typeof icd11WhoRealAdapter.version === 'function' ? await icd11WhoRealAdapter.version() : undefined
    console.log('Adapter version:', version)
    const items = typeof icd11WhoRealAdapter.fetchList === 'function' ? await icd11WhoRealAdapter.fetchList() : []
    console.log('Fetched items:', Array.isArray(items) ? items.length : 'unknown')
    if (Array.isArray(items) && items.length > 0) {
      console.log('Sample (first 10):')
      for (const it of (items as any[]).slice(0, 10)) {
        const code = (it && (it.code || it.notation || it.id)) ?? 'N/A'
        const title = (it && (it.title || it.display || it.prefLabel)) ?? 'N/A'
        console.log('-', code, '-', title)
      }
    }
  } catch (err: any) {
    console.error('Error running ICD-11 fetch:', err.message || err)
    process.exit(2)
  }
}

main()
