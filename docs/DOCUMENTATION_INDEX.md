# Documentation Index & Cleanup Plan

_Last updated: 2025-12-15_

## Quick Start (keep)
- COMECE_AQUI.md
- USAGE_GUIDE.md
- GUIA_VISUAL_FUNCIONALIDADES.md
- TESTE_INTERATIVO.md

## Product & Features (keep)
- FUNCIONALIDADES_RESUMO.md
- MAPA_NAVEGACAO.md
- GUIA_PRODUCAO_PT_BR.md
- README_MEDICAL_RECORDS.md / API_MEDICAL_RECORDS.md
- GUIA_VISUAL_FUNCIONALIDADES.md

## Operations & Production (keep)
- PRODUCTION_READINESS.md
- PRODUCTION_CHECKLIST.md
- PRODUCTION_ROADMAP.md
- PRODUCTION_SECRETS_SETUP.md
- DEPLOY_UMBREL.md / INFRA_PROVEDOR_SAAS.md / INFRA_CLINICA_LOCAL.md

## Compliance & Security (keep)
- SECURITY.md
- GAP_ANALYSIS.md
- ROADMAP.md (go-to-market)
- docs/PRIVACY_POLICY.md, docs/CONSENT_FORM.md, docs/RIPD.md, docs/REGISTRO_OPERACOES.md

## Business & Commercial (keep)
- PROPOSTA_COMERCIAL_ESTIMADA.md
- COMMERCIAL_FEATURES.md
- TIER1_IMPLEMENTACOES.md
- TIER2_IMPLEMENTATION.md

## To Review / Archive (outdated or overlapping)
- DONE: RESUMO_EXPLORACAO.md, WORKLOG.md, IMPLEMENTACOES_CONCLUIDAS.md → moved to docs/archive with root pointers.
- UPDATED.md (verify relevance)
- TEST_MEDICAL_RECORDS.md / TESTE_INTERATIVO.md overlap; TESTE_INTERATIVO.md is the manual UI/feature source of truth; TEST_MEDICAL_RECORDS.md kept for API integration tests.
- Any seed/reset scripts docs once production data policies are finalized

## Tracking Incomplete Work
- **INCOMPLETE_FEATURES.md** - Map of not-yet-implemented or partial features (NPS, BI Dashboard, Assinatura Digital, Atestados, Backups, Med Tracking); prioritized by criticality + effort.

## Status of Recent Actions
- ✅ DONE: Archive outdated docs (RESUMO_EXPLORACAO, WORKLOG, IMPLEMENTACOES_CONCLUIDAS) to docs/archive/
- ✅ DONE: Update PRODUCTION_READINESS.md with S3 uploads + observability stack (Tempo, Loki, Prometheus)
- ✅ DONE: Link DOCUMENTATION_INDEX.md from README + COMECE_AQUI
- ✅ DONE: Clarify TEST_MEDICAL_RECORDS vs TESTE_INTERATIVO scope
