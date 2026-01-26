# Truth Audit ("100% de verdade") — status atual

Este documento registra ajustes feitos para remover **dados simulados**, **métricas inventadas** e **afirmações absolutas** (ex.: “100%”, “garantido”, “production-ready”, “LGPD compliant”, “validade legal total”) quando isso não é comprovado automaticamente pelo sistema.

Princípio aplicado:
- Quando algo não é mensurável/confirmável pelo código em runtime, o sistema deve retornar `null`/“Não disponível” e a documentação deve dizer “depende de configuração/validação”.

## Correções realizadas (principais)

### Backups (scripts + docs + APIs)
- Scripts criados/alinhados com as rotas/admin:
  - `scripts/backup-complete.sh`
  - `scripts/restore-database.sh`
  - Wrappers: `scripts/backup-local.sh`, `scripts/backup-database.sh`
- Endpoint de restore corrigido para executar o script pelo path do container:
  - `app/api/admin/backups/restore/route.ts`
- Documentação de backups ajustada para remover “garantias/100%/risco 0%” e exemplos com dados fictícios:
  - `BACKUP_GUARANTEE_ALL_DOCUMENTS.md`
  - `BACKUP_DOCUMENTS_PROTECTION_GUARANTEE.md`

### Dashboard admin (métricas)
- Crescimentos e taxas sem base (ex.: período anterior = 0, ou sem consultas) foram convertidos para `null` e a UI renderiza “Não disponível”:
  - `app/api/admin/dashboard/route.ts`
  - `components/dashboard/admin-dashboard.tsx`

### Assinatura/A1 (limitações e sem promessas legais)
- Documentos revisados para evitar afirmações de validade legal/ICP-Brasil quando não implementado:
  - `CERTIFICADO_A1_SETUP.md`
  - `ASSINATURA_DIGITAL_PRODUCAO.md`
- Helper ajustado para não inventar nome “Desconhecido”:
  - `lib/certificate-a1-signer.ts`

### Documentação geral (remoção de “100%/production-ready/0 problemas de segurança”)
- Ponto de entrada factual criado para orientar navegação e reduzir dependência de relatórios “históricos”:
  - `docs/START_HERE.md`
- Ajustes pontuais em docs com afirmações absolutas:
  - `AUDIT_REPORT.md` (métricas viraram metas, não garantias)
  - `TERMS_ENFORCEMENT_IMPLEMENTATION.md` (conclusão sem “100% pronto/produção”)
  - `QUESTIONNAIRE_START_HERE.md` (sem “100%/0 segurança”; recomenda validação)
  - `DEPLOY_SUCCESS_SUMMARY.md` (metas sugeridas, sem números/100%)
  - `BUILD_RESOLUTION_SUMMARY.md`, `REBUILD_STATUS.md` (sem “100% funcional”)

## Pendências (ainda há linguagem a normalizar)

Há vários documentos de “relatórios de entrega/completion” com frases como “PRODUCTION-READY”, “100%”, “ICP-Brasil hooks ready”, etc.

Sugestão: tratar esses documentos como **histórico** e aplicar um padrão:
- Trocar “Status: PRODUCTION-READY” por “Status: requer validação no ambiente”
- Trocar “100%” por “meta/objetivo” ou remover
- Marcar integrações externas (DATASUS/Cartório/ICP-Brasil) como “depende de credenciais/integração não implementada”

Arquivos com ocorrências conhecidas (não exaustivo):
- `FINAL_COMPLETION_REPORT.md`
- `MEDICAL_CERTIFICATE_COMPLETE_REPORT.md`
- `IMPLEMENTATION_CHECKLIST.md` (ainda tem blocos com “production-ready” e “ICP-Brasil hooks ready” em outras seções)
- `DEPLOY_SUCCESS_SUMMARY.md` (há outras seções com “100% implementado” fora do trecho ajustado)

## Como validar de forma objetiva

- Typecheck: `npm run -s type-check`
- Lint: `npm run lint`
- Build: `npm run build`
- Backups: usar Settings → Backups e confirmar arquivos em `BACKUPS_DIR` e restore em ambiente separado
- Assinatura/validação: usar as rotas de validação implementadas e confirmar o comportamento (sem assumir PAdES/CAdES/TSA)
