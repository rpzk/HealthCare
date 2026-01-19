# Backup com Autocomplete - Guia de Uso

## ✨ Novas Funcionalidades

A seção **"Backups por Entidade"** agora possui campos com **autocomplete** para buscar pacientes e usuários de forma rápida e intuitiva.

## 📋 Como Usar

### Exportar Backup de Paciente

1. Acesse `/admin/backup`
2. Role até a seção **"Backups por Entidade"**
3. Na subseção **"Paciente"**:
   - Clique no campo de autocomplete
   - Digite **ao menos 2 caracteres** do nome, CPF ou email do paciente
   - Aguarde a busca (busca em tempo real com delay de 300ms)
   - Selecione o paciente na lista
   - Confirme os dados exibidos
   - Clique em **"Exportar paciente"**

**O que é exportado:**
- ✅ Dados do paciente (ID, nome, CPF, email, etc)
- ✅ Todas as consultas
- ✅ Todas as prescrições
- ✅ Requisições de exames
- ✅ Atestados médicos
- ✅ Encaminhamentos
- ✅ Prontuário médico
- ✅ Questionários respondidos
- ✅ Respostas NPS

**Arquivo gerado:**
- Nome: `patient_YYYYMMDDHHMMSS_<id>.json`
- Local: `/app/backups/healthcare/`

---

### Exportar Backup de Usuário (Profissional, Admin, etc)

1. Acesse `/admin/backup`
2. Role até a seção **"Backups por Entidade"**
3. Na subseção **"Usuário (Profissional, Admin, etc)"**:
   - Clique no campo de autocomplete
   - Digite **ao menos 2 caracteres** do nome, email ou número de registro
   - Aguarde a busca
   - Selecione o usuário na lista
   - Confirme os dados exibidos (nome, role, número de registro)
   - Clique em **"Exportar usuário"**

**O que é exportado:**
- ✅ Dados do usuário (ID, email, nome, role, etc)
- ✅ Informações de credenciais WebAuthn/Passkeys
- ✅ Atribuições de função (JobRole)
- ✅ Aceitações de termos
- ✅ Todas as consultas realizadas
- ✅ Todas as prescrições emitidas
- ✅ Requisições de exames solicitadas
- ✅ Atestados emitidos
- ✅ Encaminhamentos (como origem e destino)
- ✅ Prontuários criados
- ✅ Questionários enviados
- ✅ Respostas NPS recebidas
- ✅ Protocolos criados

**Tipos de usuários suportados:**
- ADMIN
- DOCTOR
- NURSE
- RECEPTIONIST
- PHYSIOTHERAPIST
- PSYCHOLOGIST
- HEALTH_AGENT
- TECHNICIAN
- PHARMACIST
- DENTIST
- NUTRITIONIST
- E outros

**Arquivo gerado:**
- Nome: `user_YYYYMMDDHHMMSS_<id>.json`
- Local: `/app/backups/healthcare/`

---

## 🔍 Como Funciona o Autocomplete

### Busca por Paciente
O campo busca por:
- **Nome** do paciente (case-insensitive)
- **CPF** (remove formatação automaticamente)
- **Email** (case-insensitive)

Exemplo: Digitar "joão" ou "123.456" retornará resultados correspondentes.

### Busca por Usuário
O campo busca por:
- **Nome** do usuário (case-insensitive)
- **Email** (case-insensitive)
- **Número de registro** (CRM, COREN, CRP, etc)

Exemplo: Digitar "carlos" ou "123456-SP" retornará resultados correspondentes.

### Comportamento
- ⏱️ **Delay de 300ms**: Evita muitas requisições enquanto digita
- 📊 **Máximo 10 resultados**: Limita quantidade de opções exibidas
- ✅ **Mínimo 2 caracteres**: Requer ao menos 2 caracteres para buscar
- 🔄 **Spinner de carregamento**: Indica quando a busca está em progresso
- 📌 **Confirmação visual**: Exibe dados do selecionado antes de exportar

---

## 📊 Exemplo de Resposta

### Exportação de Paciente
```json
{
  "filename": "patient_20260117132000_clxxx.json",
  "user": {
    "id": "clxxx",
    "name": "João da Silva"
  },
  "stats": {
    "consultations": 5,
    "prescriptions": 8,
    "examRequests": 3,
    "medicalCertificates": 1,
    "referrals": 0,
    "medicalRecords": 2,
    "questionnairesSent": 1,
    "npsResponses": 1
  }
}
```

### Exportação de Usuário
```json
{
  "filename": "user_20260117132100_clyyy.json",
  "user": {
    "id": "clyyy",
    "email": "carlos@hospital.com",
    "name": "Dr. Carlos",
    "role": "DOCTOR"
  },
  "stats": {
    "consultations": 45,
    "prescriptions": 120,
    "examRequests": 30,
    "medicalCertificates": 12,
    "referrals": 8,
    "medicalRecords": 25,
    "questionnairesSent": 10,
    "npsResponses": 15,
    "protocols": 3
  }
}
```

---

## 🎯 Casos de Uso

### 1. **Portabilidade de Dados (LGPD)**
- Paciente solicita cópia de seus dados
- Use "Exportar paciente" com CPF
- Entregue o arquivo JSON

### 2. **Auditoria de Profissional**
- Investigação de atividades de um médico
- Use "Exportar usuário" com email ou CRM
- Analise consultações, prescrições, certificados, etc

### 3. **Mudança de Sistema**
- Migrar dados de um paciente ou profissional
- Exporte em JSON
- Integre com outro sistema via scripts customizados

### 4. **Backup Segmentado**
- Backup apenas dos dados de uma pessoa
- Armazene separadamente
- Facilita GDPR compliance

### 5. **Análise de Padrões**
- Quantas consultas fez um paciente?
- Quantas prescrições um médico emitiu?
- Exporte e analise em ferramentas externas

---

## 🔐 Segurança

- ✅ **Autenticação obrigatória**: Apenas usuários autenticados
- ✅ **Autorização**: Apenas ADMINs podem exportar
- ✅ **Validação**: Verifica existência da entidade antes de exportar
- ✅ **Auditoria**: Registra quem fez a exportação e quando
- ✅ **JSON seguro**: Sem dados sensíveis duplicados

---

## 📂 Arquivos Gerados

Os arquivos são salvos em:
```
/app/backups/healthcare/
├── patient_20260117132000_clxxx.json     # Paciente João
├── patient_20260117133000_clyyy.json     # Paciente Maria
├── user_20260117134000_clzzz.json        # Usuário Dr. Carlos
└── user_20260117135000_clwww.json        # Usuário Admin Silva
```

**Download**: Use a seção "Backups Disponíveis" para baixar qualquer arquivo

---

## 🛠️ Endpoints da API

### Autocomplete de Pacientes
```
GET /api/admin/backups/autocomplete/patients?q=termo
```

**Resposta:**
```json
{
  "success": true,
  "results": [
    {
      "id": "clxxx",
      "label": "João da Silva - CPF: 123.456.789-00 - Email: joao@email.com",
      "value": "clxxx",
      "cpf": "123.456.789-00",
      "email": "joao@email.com",
      "name": "João da Silva"
    }
  ]
}
```

### Autocomplete de Usuários
```
GET /api/admin/backups/autocomplete/users?q=termo
```

**Resposta:**
```json
{
  "success": true,
  "results": [
    {
      "id": "clyyy",
      "label": "Dr. Carlos - DOCTOR - CRM 123456-SP - carlos@hospital.com",
      "value": "clyyy",
      "email": "carlos@hospital.com",
      "name": "Dr. Carlos",
      "role": "DOCTOR",
      "licenseNumber": "123456-SP"
    }
  ]
}
```

### Exportar Paciente
```
POST /api/admin/backups/entity/patient
Content-Type: application/json

{
  "id": "clxxx"
}
```

### Exportar Usuário
```
POST /api/admin/backups/entity/users
Content-Type: application/json

{
  "id": "clyyy"
}
```

---

## ⚠️ Notas Importantes

1. **Busca case-insensitive**: Não faz diferença maiúsculas/minúsculas
2. **CPF sem formatação**: Busque "12345678900" ou "123.456.789-00" - ambos funcionam
3. **Máximo 10 resultados**: Se houver muitos, refine a busca
4. **Atualizações em tempo real**: Se dados mudarem, busque novamente
5. **Arquivos não são sincronizados com Drive automaticamente**: Use a seção "Backups Disponíveis" para sincronizar manualmente

---

## 📝 Checklist

- [ ] Testei busca por paciente com nome
- [ ] Testei busca por paciente com CPF
- [ ] Testei busca por paciente com email
- [ ] Exportei backup de um paciente com sucesso
- [ ] Testei busca por usuário com nome
- [ ] Testei busca por usuário com email
- [ ] Testei busca por usuário com número de registro
- [ ] Exportei backup de um usuário com sucesso
- [ ] Verifiquei arquivo JSON gerado
- [ ] Testei com diferentes tipos de usuários (DOCTOR, NURSE, ADMIN, etc)
