# Status das Integrações Externas

Documentação sobre integrações que **não estão implementadas** ou estão **parcialmente implementadas**.

---

## IntegrationLog – status NOT_IMPLEMENTED

Quando uma integração não chama API externa (Cartório, SUS, Governo), o log usa `status: 'NOT_IMPLEMENTED'` em vez de `ERROR`, pois não é falha de execução.

---

## Cartório (assinatura digital / protocolo)

- **Status:** Payload preparado, API não chamada
- **Variável:** `CARTORIO_API_URL`
- **Comportamento:** Retorna `success: false` com mensagem explícita "Integração ainda não implementada"
- **Log:** Registra em `IntegrationLog` com status ERROR

---

## SUS (registro de atestados)

- **Status:** Payload preparado, API não chamada
- **Variável:** `SUS_API_URL`
- **Comportamento:** Retorna `success: false` com mensagem explícita
- **Log:** Registra em `IntegrationLog` com status ERROR

---

## Governo (verificação de protocolos)

- **Status:** Payload preparado, API não chamada
- **Comportamento:** Retorna erro explícito "não implementada"

---

## ICP-Brasil (assinatura PKI)

- **Status:** Placeholder – `signWithICPBrasil` lança erro, `verifyWithICPBrasil` retorna `valid: false`
- **Alternativa em uso:** PAdES com certificado A1 local (lib/documents/pades-signer)

---

## ICD-11 (WHO)

- **Status:** Adapter existe; integração com API oficial pendente (exige API key)
- **Arquivo:** `lib/adapters/icd11-who.ts`

---

## DATASUS (histórico do paciente)

- **Status:** Não implementado – consulta a sistemas governamentais
- **Arquivo:** `lib/integration-services.ts` – método `getPatientHistory`

---

## Lab Integration (MLLP)

- **Status:** Estrutura preparada; envio real via MLLP/HTTP pendente
- **Arquivo:** `lib/lab-integration-service.ts`

---

## Regra de ouro

**Nunca retornar sucesso para uma operação que não foi executada.**  
Todas as integrações acima retornam erro explícito quando a API externa não é chamada.
