# Checklist de Prontidão para Produção (sem dados fictícios)

Este checklist foca em **consistência**, **integridade** e **transparência**: o sistema não deve “inventar” números/estados e não deve prometer validações criptográficas/jurídicas que não existam.

## 1) Segurança / Autenticação

- Confirmar que `NODE_ENV=production` no ambiente de produção.
- Manter `ALLOW_TEST_BYPASS` **desabilitado em produção** (o código já bloqueia em `NODE_ENV=production`).
- Confirmar `NEXTAUTH_SECRET` configurado.
- Confirmar `NEXTAUTH_URL` configurado com o domínio público.

## 2) Banco de dados / Prisma

- Confirmar `DATABASE_URL` apontando para o Postgres correto.
- Rodar migrações/geração Prisma conforme seu fluxo:
  - `npm run db:migrate` (ou `npm run db:push` quando aplicável)
  - `npx prisma generate`

## 3) Redis / Filas (IA e jobs)

- Confirmar `REDIS_HOST` e `REDIS_PORT`.
- Se usar worker de IA, garantir o processo `npm run worker:ai` rodando.

## 4) Integridade / “Assinaturas”

- **Assinatura registrada**: o sistema registra metadados e/ou tokens de integridade.
- **Validação criptográfica ICP-Brasil / assinatura PDF A1**: só deve ser apresentada como “validada” se houver implementação real.
- Se o fluxo de integridade por HMAC for usado, configurar `DOCUMENT_INTEGRITY_SECRET`.

## 5) Telemedicina

- Se usar WebRTC/Coturn, validar as variáveis do Coturn e a política de rede do deploy.
- Rodar o smoke test disponível em `scripts/test-telemedicine.sh` quando aplicável.

## 6) Observabilidade (opcional)

- OpenTelemetry é opcional. Se habilitar:
  - renomear `instrumentation.ts.disabled` → `instrumentation.ts`
  - configurar `OTEL_ENABLED=true` e variáveis `OTEL_*` necessárias.

## 7) Regras de “não inventar dados”

- Métricas/indicadores devem ser:
  - derivadas do banco, **ou**
  - retornadas como `null`/“Não disponível” quando o denominador não existe.
- Em telas/relatórios com áreas ainda não implementadas, exibir explicitamente “Não disponível”.

## 8) Comandos úteis

- Type-check: `npm run -s type-check`
- Build/produção via compose: `docker compose -f docker-compose.prod.yml up -d --build`
