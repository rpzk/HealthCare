# 📊 Comparação Visual - SSF Legacy vs Next.js Atual

## 1️⃣ DADOS CLÍNICOS

### Consultas SSF (Django)
```python
class Consulta(models.Model):
    consulta          # DateTime
    unidade          # FK UnidadeDeSaude
    profissional     # FK ProfissionalDeSaude
    pessoa           # FK Pessoa
    grupo            # Clínica, Ginecologia, Pediatria
    
    # Demanda
    agenda           # Boolean - Agendada
    dia              # Boolean - Imediata
    orientacao       # Boolean - Orientação
    urgencia         # Boolean - Urgência
    continuado       # Boolean - Acompanhamento
    
    # Saúde Mental
    mental           # Boolean
    alcool           # Boolean
    drogas           # Boolean
    
    # DCNT
    hipertensao      # Boolean
    diabetes         # Boolean
    hanseniase       # Boolean
    tuberculose      # Boolean
    
    # Preventivo
    preventivo       # Boolean
    puericultura     # Boolean
    pn               # Boolean - Pré-natal
    puerperio        # Boolean
    
    # Exames
    laboratorio      # Boolean
    radiologia       # Boolean
    ecografia        # Boolean
    mamografia       # Boolean
    ECG              # Boolean
    
    # Medidas
    peso             # Float
    cintura          # Float
    quadril          # Float
    altura           # Float
    pc               # Float - Perímetro Cefálico
    aleitamento      # String - Tipo
```

### Consultas Next.js (Atual)
```typescript
type Consultation = {
  id: string
  patient: User
  professional: User
  healthUnit: HealthUnit
  date: Date
  notes: string
  diagnosis: string[]
  // ❌ Sem:
  // - Classificação de demanda
  // - Flags de DCNT
  // - Medidas antropométricas
  // - Aleitamento
  // - Saúde mental
}
```

### Gap
```
❌ Demanda não classificada (agenda/dia/urgência)
❌ DCNT não rastreadas
❌ Dados antropométricos não coletados
❌ Saúde mental não rastreada
❌ Tipo de exame não estruturado
```

---

## 2️⃣ PRÉ-NATAL

### SSF (Completo)
```python
class PreNatal(models.Model):
    consulta         # FK Consulta
    gestacao         # FK Gestacao
    trimestre        # "1º", "2º", "3º"
    utero            # Int - Altura uterina
    bcf              # Int - Batimento cardíaco fetal
    mf               # Boolean - Movimentos fetais
    
    # Testes
    ts               # Boolean - Teste Sífilis
    vdrl             # Boolean
    urina            # Boolean
    glicemia         # Boolean
    hb               # Boolean - Hemoglobina
    ht               # Boolean - Hematócrito
    hiv              # Boolean
    hbsag            # Boolean - Hepatite B
    toxoplasmose     # Boolean
    
    # Vacinação
    tetano1          # Boolean - 1ª dose
    tetano2          # Boolean - 2ª dose
    tetano3          # Boolean - Reforço
    tetano4          # Boolean - Imune
    
    # Risco
    risco            # "BR" (Baixo Risco) ou "AR" (Alto Risco)
    
    # Parto
    parto            # "não", "PH" (Parto Hospitalar), "PD" (Parto Domiciliar)
    puerperio        # Boolean - Cuidados pós-parto
```

### Next.js (Atual)
```typescript
type Pregnancy = {
  id: string
  patient: User
  estimatedDueDate: Date
  // ❌ Sem:
  // - Consultas de pré-natal ligadas
  // - Testes estruturados
  // - Vacinação
  // - Avaliação de risco
  // - Histórico de medidas
}
```

### Gap
```
🔴 CRÍTICO - Praticamente inexiste no novo sistema
❌ Sem estrutura de consultas periódicas
❌ Sem rastreamento de testes
❌ Sem integração com vacinação
❌ Sem classificação de risco
```

---

## 3️⃣ HIERARQUIA GEOGRÁFICA

### SSF (9 Níveis)
```
Brasil
├─ São Paulo
│  ├─ São Paulo (Município)
│  │  ├─ Zona Centro
│  │  │  ├─ Distrito Sanitário 1
│  │  │  │  ├─ Subprefeitura Centro
│  │  │  │  │  ├─ Bairro da Sé
│  │  │  │  │  │  ├─ Área 01
│  │  │  │  │  │  │  ├─ Microárea 01 ← ACS com ~300 famílias
│  │  │  │  │  │  │  ├─ Microárea 02
│  │  │  │  │  │  │  └─ Microárea 03
│  │  │  │  │  │  │
│  │  │  │  │  │  ├─ Área 02
│  │  │  │  │  │  └─ ...
│  │  │  │  │  │
│  │  │  │  │  └─ Bairro Consolação
│  │  │  │  └─ Subprefeitura Pinheiros
│  │  │  ├─ Distrito Sanitário 2
│  │  │  └─ Distrito Sanitário 3
│  │  └─ Zona Leste
│  └─ Campinas (Município)
└─ Rio de Janeiro
```

### Next.js (4 Níveis)
```
Brasil
├─ São Paulo (State)
│  ├─ São Paulo (City)
│  │  └─ Rua das Flores, nº 123 (Address)
│  │     ❌ Sem zona
│  │     ❌ Sem distrito
│  │     ❌ Sem microárea
│  └─ Campinas (City)
└─ Rio de Janeiro (State)
```

### Gap
```
🔴 CRÍTICO - BLOQUEIA PSF
Faltam 5 níveis:
  ❌ Zona (administrativa)
  ❌ Distrito Sanitário (vigilância)
  ❌ Subprefeitura (executiva)
  ❌ Área (agrupamento)
  ❌ Microárea (cobertura ACS)

Impacto:
  🚫 Impossível rastrear cobertura por ACS
  🚫 Impossível gerar relatórios regionais
  🚫 Impossível integrar com SIAB
  🚫 Impossível acessar dados por microárea
```

---

## 4️⃣ RELATÓRIOS SIAB

### SSF - Produção Mensal
```
📊 RELATÓRIO DE PRODUÇÃO MENSAL - SIAB

PERÍODO: Janeiro/2025
UNIDADE: CSF Vila Sul

═════════════════════════════════════════════════════

📍 FAIXA ETÁRIA
  Menor 1 ano:        45 consultas
  1-4 anos:          120 consultas
  5-9 anos:           95 consultas
  10-14 anos:        110 consultas
  15-19 anos:        105 consultas
  20-39 anos:        380 consultas
  40-49 anos:        165 consultas
  50-59 anos:        140 consultas
  Maior 60 anos:     180 consultas

═════════════════════════════════════════════════════

👨‍⚕️ TIPO DE ATENDIMENTO (Clínica)
  Agenda:             420 consultas (60%)
  Demanda Imediata:   140 consultas (20%)
  Urgência:            80 consultas (11%)
  Orientação:          40 consultas (6%)
  Continuado:          65 consultas (9%)

═════════════════════════════════════════════════════

🏥 EXAMES COMPLEMENTARES
  Laboratório:        285 solicitações
  Radiologia:          95 solicitações
  Ultrassom:           60 solicitações
  Mamografia:          25 solicitações
  ECG:                 15 solicitações

═════════════════════════════════════════════════════

🎯 PROBLEMAS RASTREADOS
  Hipertensão:        185 casos
  Diabetes:           120 casos
  DST/AIDS:            18 casos
  Tuberculose:          3 casos
  Hanseníase:           1 caso
  Saúde Mental:        45 casos
  Abuso de Álcool:     22 casos
  Abuso de Drogas:     15 casos

═════════════════════════════════════════════════════

👶 COBERTURA ESPECIAL
  Pré-Natal:           32 gestantes
  Puericultura:        55 crianças
  Preventivo (Pap):    85 mulheres
  Puerpério:           12 mulheres

═════════════════════════════════════════════════════

✅ ÁREA DE ABRANGÊNCIA
  Consultas na área:   745 (100%)
  Consultas fora área:   0 (0%)

═════════════════════════════════════════════════════
```

### Next.js (Inexiste)
```
❌ SEM RELATÓRIO DE PRODUÇÃO
❌ SEM AGREGAÇÃO POR FAIXA ETÁRIA
❌ SEM RASTREAMENTO DE DCNT
❌ SEM INTEGRAÇÃO COM SIAB
❌ Impossível gerar documento oficial para repasse
```

### Gap
```
🔴 CRÍTICO - BLOQUEIA REPASSE SUS
Relatório SIAB é obrigatório para:
  • Justificar orçamento
  • Solicitar repasse de verbas
  • Comprovar produção à SMS/SES
  • Auditoria de qualidade

Sem este relatório:
  💰 Impossível receber verbas
  📊 Impossível comprovar trabalho
  ⚠️ Risco de auditoria
```

---

## 5️⃣ ATESTADOS

### SSF (11 Tipos)
```python
class Atestado(models.Model):
    atestado_esc = (
        ('1', 'Comparecimento'),           # Apenas compareceu
        ('2', 'Turno'),                    # Turno de trabalho
        ('3', 'Afastamento'),              # Licença médica
        ('4', 'Passe Livre Municipal'),    # Transporte
        ('5', 'Passe LIvre Intermunicipal'),
        ('6', 'Perícia'),                  # Avaliação período
        ('7', 'Licença Maternidade'),      # 120 dias
        ('8', 'Adicional'),                # Insalubridade
        ('9', 'Periódico'),                # Anual
        ('10', 'Demicional'),              # Desligamento
        ('11', 'Saúde'),                   # Problema de saúde
    )
    descricao = TextField  # Descrição do problema
    
    # Integração com assinatura digital (seria possível!)
```

### Next.js (Atual)
```typescript
❌ SEM MODELO DE ATESTADOS
❌ Consultas não geram atestados
❌ Sem tipos estruturados
❌ Sem geração de documento
❌ Sem assinatura digital integrada
```

### Gap
```
🔴 CRÍTICO - MAS FÁCIL DE IMPLEMENTAR
Impacto:
  ❌ Pacientes não conseguem comprovar ausência
  ❌ Sem integração com assinatura digital (já existe!)
  ❌ Sem rastreamento de emissão
  
Solução técnica (simples):
  1. Criar model MedicalCertificate
  2. Integrar com assinatura digital existente
  3. Gerar PDF assinado
  4. Total: 30 horas
```

---

## 6️⃣ MICROÁREAS

### SSF - Visualização
```
┌─ BAIRRO VILA MARIANA ────────────────────────┐
│                                               │
│  ┌─ ÁREA 01 ──────────────┐                  │
│  │                         │                  │
│  │  ┌─ Microárea 01 ────┐ │                  │
│  │  │ Rua A, 1-30      │ │  ACS: João      │
│  │  │ ~280 famílias    │ │  Visitou: 85%   │
│  │  │ Último mapa: ✅  │ │                  │
│  │  └──────────────────┘ │                  │
│  │                         │                  │
│  │  ┌─ Microárea 02 ────┐ │                  │
│  │  │ Rua B, 1-50      │ │  ACS: Maria     │
│  │  │ ~290 famílias    │ │  Visitou: 92%   │
│  │  │ Último mapa: ✅  │ │                  │
│  │  └──────────────────┘ │                  │
│  │                         │                  │
│  │  ┌─ Microárea 03 ────┐ │                  │
│  │  │ Rua C, 1-40      │ │  ACS: Pedro     │
│  │  │ ~260 famílias    │ │  Visitou: 78%   │
│  │  │ Último mapa: ⚠️   │ │                  │
│  │  └──────────────────┘ │                  │
│  │                         │                  │
│  └─────────────────────────┘                  │
│                                               │
│  ┌─ ÁREA 02 ──────────────┐                  │
│  │ ...                    │                  │
│  └─────────────────────────┘                  │
│                                               │
└───────────────────────────────────────────────┘
```

### Next.js (Atual)
```
❌ SEM CONCEITO DE MICROÁREA
- Endereços são apenas geolocalização
- Sem associação com ACS
- Sem cálculo de cobertura
- Sem mapa visual

Impacto:
  🚫 Impossível PSF
  🚫 Impossível cobertura por ACS
  🚫 Impossível visita domiciliar planejada
```

---

## 7️⃣ VIGILÂNCIA EM SAÚDE

### SSF
```python
# Agravos Notificáveis
class Agravo(models.Model):
    agravo          # CID-10
    notif           # "imediata" ou "semanal"
    ms              # Notificar Ministério Saúde
    ses             # Notificar Secretaria Estadual
    sms             # Notificar Secretaria Municipal

# Vacinas
class Vacina(models.Model):
    nome
    doses           # "3 doses"
    intervalo       # "0, 1, 6 meses"
    eficacia        # 95%
    adversos        # Eventos adversos
    contraindicacoes
```

### Next.js (Atual)
```typescript
❌ SEM INTEGRAÇÃO DE VIGILÂNCIA
- Sem rastreamento de agravos
- Sem calendário vacinal
- Sem alertas epidemiológicos
- Sem indicadores
```

---

## 📊 TABELA COMPARATIVA COMPLETA

| Funcionalidade | SSF | Next.js | Gap | Prioridade |
|---|---|---|---|---|
| **Clínica** |
| Consulta básica | ✅ | ✅ | 🟢 | - |
| Demanda classificada | ✅ | ❌ | 🔴 | 🟠 |
| DCNT rastreado | ✅ | ❌ | 🔴 | 🔴 |
| Medidas antropométricas | ✅ | ❌ | 🔴 | 🟠 |
| **Saúde da Mulher** |
| Pré-Natal estruturado | ✅ | ❌ | 🔴 | 🔴 |
| História ginecológica | ✅ | ❌ | 🔴 | 🟠 |
| Preventivo (Pap) | ⚠️ | ⚠️ | 🟡 | 🟡 |
| **Criança** |
| Puericultura | ✅ | ❌ | 🔴 | 🟠 |
| Aleitamento | ✅ | ❌ | 🔴 | 🟠 |
| Perímetro cefálico | ✅ | ❌ | 🔴 | 🟡 |
| **Documentos** |
| Atestados | ✅ (11 tipos) | ❌ | 🔴 | 🔴 |
| Encaminhamentos | ✅ | ⚠️ | 🔴 | 🟠 |
| Prescrições classificadas | ✅ | ⚠️ | 🔴 | 🟠 |
| **Geografia** |
| País/Estado/Município | ✅ | ✅ | 🟢 | - |
| Zona/Distrito/Subpref | ✅ | ❌ | 🔴 | 🔴 |
| Bairro/Área | ✅ | ⚠️ | 🔴 | 🔴 |
| Microárea | ✅ | ❌ | 🔴 | 🔴 |
| Coordenadas GPS | ✅ | ⚠️ | 🟡 | 🟠 |
| **Relatórios** |
| Produção diária | ✅ | ❌ | 🔴 | 🔴 |
| Produção mensal SIAB | ✅ | ❌ | 🔴 | 🔴 |
| Agregação por faixa etária | ✅ | ❌ | 🔴 | 🔴 |
| Agregação por microárea | ✅ | ❌ | 🔴 | 🔴 |
| PDF reportes | ✅ | ❌ | 🔴 | 🟠 |
| **Vigilância** |
| Agravos notificáveis | ✅ | ❌ | 🔴 | 🟠 |
| Calendário vacinal | ✅ | ❌ | 🔴 | 🔴 |
| Indicadores epidemiológicos | ✅ | ❌ | 🔴 | 🔴 |
| Integração SINAN | ✅ | ❌ | 🔴 | 🔴 |
| **Gestão** |
| Dashboard | ⚠️ | ✅ | 🟡 | - |
| Usuários e perfis | ✅ | ✅ | 🟢 | - |
| Logs de auditoria | ⚠️ | ✅ | 🟡 | - |
| API REST | ❌ | ✅ | 🟢 | - |

---

## 🎯 Conclusão

```
┌─ SSF (Django) ──────────────┐  ┌─ Next.js (Atual) ────────┐
│ ✅ PSF/ESF completo        │  │ ✅ Moderno e rápido      │
│ ✅ Relatórios SIAB         │  │ ✅ Mobile-first          │
│ ✅ Vigilância              │  │ ✅ Segurança avançada    │
│ ✅ Gestão de gestantes     │  │ ✅ Assinatura digital    │
│ ✅ Rastreamento DCNT       │  │ ✅ Telemedicina         │
│ ✅ Microáreas              │  │ ✅ Analytics            │
│ ❌ UI desatualizado        │  │ ❌ Faltam 42 features    │
│ ❌ Código legado           │  │ ❌ SIAB incompleto      │
│ ❌ Sem mobile              │  │ ❌ PSF/ESF minimal      │
│ ❌ Performance ruim        │  │ ❌ Vigilância mínima    │
└────────────────────────────┘  └──────────────────────────┘

👉 SOLUÇÃO: Portar features críticas do SSF para Next.js
   Mantém modernidade, recupera funcionalidade
```

---

**Status:** Análise Completa ✅  
**Próxima Ação:** Iniciar implementação de Hierarquia Geográfica  
**Tempo até Funcional:** 8 semanas (Phase 1)
