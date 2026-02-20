# Checklist de Preparação - Apresentação HealthCare

**Data:** 21/02/2026  
**Audiência:** TI  
**Foco:** Segurança e Compliance

> ✅ **Última revisão:** 20/02/2026 | Sistema validado com build de produção

---

## 🎯 Antes da Apresentação

### Sistema
- [ ] Verificar se todos os containers estão rodando:
  ```bash
  docker compose ps
  ```
- [ ] Testar health check:
  ```bash
  curl http://localhost:3000/api/health
  ```
- [ ] Verificar se o certificado digital está configurado
- [ ] Fazer login de teste no sistema

### Ambiente
- [ ] Fechar aplicações desnecessárias
- [ ] Desativar notificações do sistema
- [ ] Preparar segundo monitor (se disponível)
- [ ] Testar projetor/compartilhamento de tela

### Apresentação
- [ ] Abrir apresentação: `docs/APRESENTACAO_TI.html`
  - **Não precisa de login** - é um arquivo HTML estático
  - Pode abrir diretamente no navegador (File > Open)
  - Ou usar: `python3 -m http.server 8080` na pasta docs e acessar http://localhost:8080/APRESENTACAO_TI.html
- [ ] Testar navegação (setas ← →, espaço, touch)
- [ ] Verificar se fontes carregam corretamente (precisa de internet para Tailwind CDN)

---

## 🖥️ URLs para Demo

| Recurso | URL |
|---------|-----|
| **Aplicação** | http://localhost:3000 |
| **Apresentação** | file:///home/umbrel/HealthCare/docs/APRESENTACAO_TI.html |
| **Validação ITI** | https://validar.iti.gov.br |
| **Health Check** | http://localhost:3000/api/health |
| **SBIS Compliance** | http://localhost:3000/api/compliance/sbis |
| **Dashboard Prontuários** | http://localhost:3000/medical-records/dashboard |
| **Painel LGPD** | http://localhost:3000/minha-saude/privacidade |
| **Logs Auditoria** | http://localhost:3000/admin/audit |

---

## 🎬 Roteiro da Demonstração

### 1. Login com Passkey (2 min)
- Mostrar tela de login
- Demonstrar autenticação biométrica
- Mencionar: "WebAuthn/FIDO2 - sem senhas"

### 2. Dashboard Geral (1 min)
- Visão geral do sistema
- Mostrar papéis (RBAC): Admin, Médico, Enfermeiro, Paciente

### 3. Criar Prescrição (3 min)
- Navegar para prescrições
- Criar nova prescrição
- Mostrar campos obrigatórios CFM
- Destacar: medicamento controlado requer quantidade por extenso

### 4. Assinar Digitalmente (2 min)
- Clicar em "Assinar com Certificado Digital"
- Selecionar certificado A1
- Mostrar PDF gerado com assinatura

### 5. Validar no ITI (2 min)
- Abrir https://validar.iti.gov.br
- Upload do PDF assinado
- Mostrar resultado: "Assinatura válida"

### 6. Dashboard de Prontuários (2 min) ⭐ NOVO
- Navegar para /medical-records/dashboard
- Mostrar estatísticas: total, por tipo, por prioridade
- Gráficos de atividade diária
- Lista de prontuários recentes

### 7. Painel LGPD - 5 Abas (3 min) ⭐ ATUALIZADO
- Navegar para /minha-saude/privacidade
- **Aba Exportar**: Baixar dados em JSON
- **Aba Acessos**: Ver quem acessou seus dados
- **Aba Termos**: Histórico de termos aceitos (NOVO!)
- **Aba Oposição**: Opor-se a tratamento de dados
- **Aba Excluir**: Solicitar exclusão com DPO

### 8. Assistente IA (2 min)
- Abrir consulta com IA
- Demonstrar sugestão de tratamento
- Mencionar: "IA local - dados nunca saem do servidor"

### 9. Logs de Auditoria (1 min)
- Navegar para /admin/audit
- Mostrar filtros: ação, recurso, usuário, data
- Estatísticas das últimas 24h
- Destacar: "Rastreabilidade completa"

---

## 💬 Pontos-Chave para Enfatizar

### LGPD (~100% Conforme)
- Criptografia AES-256-GCM
- Portabilidade de dados (Art. 18)
- Anonimização para IA
- DPO workflow para exclusão
- **Histórico de termos aceitos** (novo!)
- **Oposição ao tratamento de dados** (Art. 18, §2º)

### Autenticação MFA
- WebAuthn/Passkeys (biométrico)
- Rate limiting (300 req/min)
- Bloqueio após 5 tentativas
- JWT com expiração

### SBIS/CFM (91.9%)
- Resolução CFM 2.218/2018
- Guarda de 20 anos
- Versionamento de prontuários
- Medicamentos controlados

### FHIR R4
- Interoperabilidade com laboratórios
- RNDS e e-SUS APS
- Codificação LOINC, SNOMED-CT

### Certificado Digital
- PAdES-B e PAdES-T
- Certificados A1 e A3
- Carimbo de tempo (TSA)
- Validação OCSP

---

## ❓ Perguntas Frequentes (Q&A)

**P: Onde os dados são armazenados?**
> R: PostgreSQL on-premise, com backup automático e criptografia AES-256.

**P: A IA envia dados para a nuvem?**
> R: Não. Usamos Ollama (LLaMA 3) rodando localmente. Zero transmissão externa.

**P: Como funciona a assinatura digital?**
> R: Padrão PAdES ICP-Brasil, compatível com certificados A1 e A3. Validado pelo ITI.

**P: Quanto tempo os dados são mantidos?**
> R: Prontuários médicos: 20 anos (CFM). Logs de auditoria: 5 anos. Backups: 90 dias.

**P: E se o servidor cair?**
> R: RTO de 15min-2h, RPO de 24h. Backup 3-2-1 com offsite em S3.

**P: Vocês têm certificação SBIS?**
> R: Estamos em 91.9% de conformidade. Pendente auditoria externa para certificação oficial.

---

## 🛠️ Troubleshooting Rápido

### Container parado
```bash
docker compose up -d
```

### Banco não conecta
```bash
docker compose restart postgres
```

### Certificado não funciona
- Verificar se o .pfx está válido
- Checar data de expiração
- Confirmar senha do certificado

### Lentidão
```bash
docker compose restart app
```

---

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `docs/APRESENTACAO_TI.html` | Apresentação de slides |
| `docs/SBIS_CFM_COMPLIANCE.md` | Checklist SBIS completo |
| `docs/LGPD_COMPLIANCE_REPORT.md` | Relatório LGPD |
| `docs/CFM_PEP_COMPLIANCE_REPORT.md` | Conformidade CFM |

---

## ✅ Pós-Apresentação

- [ ] Coletar feedback
- [ ] Anotar perguntas não respondidas
- [ ] Enviar apresentação por email (se solicitado)
- [ ] Agendar follow-up técnico (se necessário)

---

*Boa apresentação!* 🚀
