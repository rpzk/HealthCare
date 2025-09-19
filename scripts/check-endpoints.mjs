#!/usr/bin/env node
import fetch from 'node-fetch'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function hit(path) {
  const url = BASE + path
  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    const ms = Date.now() - t0
    const text = await res.text()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text.slice(0, 200) }
    console.log(`\n[REQUEST] ${url} (${res.status}) ${ms}ms`)
    console.log('[BODY]', typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : parsed)
  } catch (e) {
    console.error(`\n[ERROR] ${url}`, e)
  }
}

async function main() {
  await hit('/api/patients')
  await hit('/api/prescriptions?page=1&limit=5')
  await hit('/api/admin/security?action=security-overview')
}

main()
