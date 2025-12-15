# Análise de Features Legadas do SSF (Django) para Importação no Sistema Atual

**Data da Análise:** Dezembro 2025  
**Status:** Features não portadas para o sistema Next.js/React atual

---

## 📊 SUMÁRIO EXECUTIVO

Foram identificadas **42 features principais** no código legado Django/SSF que ainda não foram portadas para o sistema atual. Classificadas em 4 categorias críticas:

- 🏥 **Dados Clínicos Avançados** (13 features)
- 📍 **Endereçamento/Localização** (8 features)
- 📋 **Relatórios SIAB-compatíveis** (12 features)
- 🔐 **Vigilância em Saúde** (9 features)

---

## 1️⃣ DADOS CLÍNICOS AVANÇADOS (Não Portadas)

### 1.1 Pré-Natal Completo
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `PreNatal`

```python
class PreNatal(models.Model):
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE)
    gestacao = models.ForeignKey(Gestacao, on_delete=models.CASCADE)
    trimestre (choices: 1º, 2º, 3º Trimestre)
    utero (Altura Uterina)
    bcf (Batimento Cardíaco Fetal)
    mf (Movimentos Fetais)
    ts, vdrl, urina, glicemia, hb, ht, hiv, hbsag, toxoplasmose
    tetano (1ª D, 2ª D, Ref, Imune)
    risco (BR, AR)
    parto (não, PH, PD)
    puerperio
```

**Impacto:** 
- Gestantes perdem rastreabilidade de pré-natal
- Sem integração com dados de gestação
- Falta de indicadores epidemiológicos

**Complexidade:** ⚠️ **ALTA** - Requer novo modelo + API + UI forms

---

### 1.2 História Ginecológica/Obstétrica
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `HistoriaGinecologica`

```python
class HistoriaGinecologica(models.Model):
    consulta = models.ForeignKey(Consulta)
    data
    tipo (choices: Menarca, Sexarca, Contracepção, Menopausa)
    descricao
```

**Impacto:**
- Histórico reprodutivo não rastreável
- Sem informações sobre menarca/menopausa
- Dados de contracepção não mapeados

**Complexidade:** ⚠️ **MÉDIA** - Requer timeline visual

---

### 1.3 Atestados Médicos Estruturados
**Status:** ❌ Não existe no novo sistema  
**Localização Legacy:** `ssf/consultas/models.py` → `Atestado`

```python
class Atestado(models.Model):
    consulta = models.ForeignKey(Consulta)
    tipo (choices: Comparecimento, Turno, Afastamento, Passe Livre Municipal,
          Passe Livre Intermunicipal, Perícia, Licença Maternidade, 
          Adicional, Periódico, Demicional, Saúde)
    descricao
```

**Recursos:**
- 11 tipos diferentes de atestados
- Integração com consultas
- Geração de documentos

**Impacto:** ❌ Atestados completamente desapareceram do novo sistema

**Complexidade:** ⚠️ **ALTA** - Requer PDF generation, assinatura digital

---

### 1.4 Encaminhamentos para Especialidades
**Status:** ❌ Não existe no novo sistema (parcialmente em tele?)
**Localização Legacy:** `ssf/consultas/models.py` → `Encaminhamento`

```python
class Encaminhamento(models.Model):
    consulta = models.ForeignKey(Consulta)
    referencia = models.ForeignKey(Referencia)
    descricao
    unidade = models.ForeignKey(UnidadeDeSaude)
    data (marcação)
    profissional = models.ForeignKey(ProfissionalDeSaude)
```

**Recurso em SSF:** Rastreamento completo de encaminhamentos com data de marcação

**Status Atual:** ❌ Não integrado com agenda de telemedicina

**Complexidade:** ⚠️ **ALTA** - Requer integração com agendamento

---

### 1.5 Receitas/Prescrições Classificadas
**Status:** ⚠️ **PARCIALMENTE PORTADA** (incompleta)
**Localização Legacy:** `ssf/consultas/models.py` → `Prescricao`

```python
class Prescricao(models.Model):
    medicacao (FK)
    uso
    quantidade
    orientacao
    prazo
    # Integração via:
    - medicacao.receita (1=comum, 2=comum, 3=controlada, 4=azul, 5=amarela, 6=fitoterapico)
```

**Recursos No SSF:**
- Classificação de medicamentos por tipo de receita
- Integração com vigilância sanitária (receita azul/amarela)
- Suporte para fitoterápicos

**Impacto:** Sistema atual tem prescrições genéricas, faltam:
- Classificação de receitas
- Geração de receitas impressas diferenciadas
- Rastreamento de medicamentos controlados

**Complexidade:** ⚠️ **ALTA** - Requer novo schema + geração PDF específica

---

### 1.6 Avaliação Nutricional em Consultas
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
campos_nutricionais:
    - peso (FloatField)
    - cintura (FloatField) 
    - quadril (FloatField)
    - altura (FloatField)
    - pc (perímetro cefálico, FloatField)
    - aleitamento (choices: Exclusivo, Predominante, Complementar, Inexistente)
    - bmi (pode ser calculado)
```

**Impacto:**
- Sem rastreamento de IDHM
- Sem avaliação de desnutrição/obesidade
- Sem histórico nutricional

**Complexidade:** 🟢 **MÉDIA** - Requer cálculos (IMC, percentis pediátricos)

---

### 1.7 Gestação com Histórico Completo
**Status:** ⚠️ **MODELO EXISTE** mas desconectado
**Localização Legacy:** `ssf/pessoas/models.py` → `Gestacao`

```python
class Gestacao(models.Model):
    pessoa (FK Pessoa - gestante)
    ig (idade gestacional)
    dpp (data provável do parto)
    # Relação 1:N com PreNatal
    prenatal_set
    # Relação 1:N com Consulta via PreNatal
```

**Status Atual:** Modelo existe em Prisma mas não é utilizado em pré-natal

**Impacto:** Sem rastreamento integrado de gestação

**Complexidade:** 🟢 **MÉDIA** - Requer integração entre models existentes

---

### 1.8 Epidemiologia de Doenças Crônicas
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
flags_cronicos:
    - hipertensao (Boolean)
    - diabetes (Boolean) 
    - hanseniase (Boolean)
    - tuberculose (Boolean)
    - dst (Boolean)
```

**Impacto:**
- Sem rastreamento de DCNT
- Sem relatórios epidemiológicos
- Sem alertas para casos crônicos

**Complexidade:** 🟢 **SIMPLES** - Requer apenas adição de campos + dashboards

---

### 1.9 Classificação de Tipos de Atendimento
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
grupo (choices: Clínica, Ginecologia, Pediatria)
agenda (Boolean)  # Demanda Agendada
dia (Boolean)     # Demanda Imediata
orientacao (Boolean)  # Atendimento para Orientação
urgencia (Boolean)    # Urgência com Observação
continuado (Boolean)  # Atendimento Continuado
```

**Impacto:**
- Sem classificação de tipo de atendimento
- Impossível filtrar por tipo de demanda
- Relatórios de tipo de atendimento não existem

**Complexidade:** 🟢 **SIMPLES** - Requer apenas adição de campos enum

---

### 1.10 Vigilância de Saúde Mental
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
mental (Boolean)  # Saúde Mental
alcool (Boolean)  # Usuário de Álcool
drogas (Boolean)  # Usuário de Drogas
```

**Impacto:**
- Sem rastreamento de transtornos mentais
- Sem dados de abuso de substâncias
- Sem integração com referenciações

**Complexidade:** 🟢 **SIMPLES** - Adicionar campos + formulário

---

### 1.11 Exames Complementares Estruturados
**Status:** ⚠️ **PARCIALMENTE PORTADA** 
**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
laboratorio (Boolean)      # Laboratório
radiologia (Boolean)       # Radiologia
ecografia (Boolean)        # Ecografia
obstetrica (Boolean)       # Ecografia Obstétrica
mamografia (Boolean)       # Mamografia
ECG (Boolean)             # Eletrocardiograma
patologia (Boolean)       # Patologia/Histopatologia
fisioterapia (Boolean)    # Fisioterapia
```

**Status Atual:** Modelo "Exam" existe mas sem campos específicos de estrutura

**Impacto:** Sem rastreamento detalhado de tipo de exame solicitado

**Complexidade:** 🟢 **MÉDIA** - Requer schema detalhado

---

### 1.12 Análise Sociodemográfica Familiar
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/pessoas/models.py` → `Familia`

```python
domicilio_esc (choices: Casa, Apartamento, Cômodo, Outros)
ocupacao (choices: Próprio, Alugado, Arrendado, Cedido, Invasão, Financiado, Outra)
material (choices: Tijolo/Adobe, Taipa revestida, Taipa não revestida, 
                   Madeira, Material Aproveitado, Outra)
pecas (número de cômodos)
eletricidade (Boolean)
iluminacao (choices: Relógio próprio, Sem relógio, Relógio comunitário, 
                     Lampião, Vela, Outro)
lixo (choices: Coletado, Queimado/Enterrado, Céu aberto, Outro)
agua (choices: Filtração, Fervura, Cloração, Sem tratamento, Outro)
abastecimento (choices: Rede Pública, Poço ou nascente, Carro Pipa, Outro)
saneamento (choices: Rede pública, Fossa, Céu aberto, Outro)
```

**Impacto:** Importantíssimo para vigilância sociodemográfica em PSF

**Complexidade:** ⚠️ **ALTA** - Requer múltiplos campos + interface intuitiva

---

### 1.13 Cobertura de Saúde e Procura por Atendimento
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/pessoas/models.py` → `Familia`

```python
cobertura (CharField - livre)
pacs (Boolean)          # PACS
usf (Boolean)          # Unidade de Saúde da Família
usb (Boolean)          # Unidade Básica de Saúde
convenio (Boolean)     # Plano Privado

procura (CharField - livre)
hospital (Boolean)     # Procura Hospital
unidade (Boolean)      # Procura Unidade de Saúde
benzedeira (Boolean)   # Procura Benzedeira
farmacia (Boolean)     # Procura Farmácia
```

**Impacto:** Sem dados de cobertura assistencial

**Complexidade:** 🟢 **SIMPLES** - Requer apenas adição de campos

---

## 2️⃣ ENDEREÇAMENTO E LOCALIZAÇÃO GEOGRÁFICA

### 2.1 Hierarquia Geográfica Completa (SSF Enderecamento App)
**Status:** ❌ Completamente ausente no novo sistema
**Localização Legacy:** `ssf/enderecamento/models.py`

```python
Hierarquia SSF (mais detalhada):
├─ País (com área, bandeira)
├─ Estado (com área, bandeira)
├─ Município (com área, bandeira)
├─ Zona (com área)
├─ Distrito (com área)
├─ Subprefeitura
├─ Bairro (com área)
├─ Logradouro (com latitude/longitude)
└─ Número/Complemento

Hierarquia Atual (Prisma):
├─ Country (muito genérico)
├─ State (genérico)
├─ City (genérico)
└─ Address (apenas endereço)

CRÍTICO: SSF tem 9 níveis, Prisma tem 4!
```

**Features Faltando:**
- 🗺️ Zona
- 🗺️ Distrito Sanitário (diferente de município)
- 🗺️ Subprefeitura (específico de estrutura administrativa)
- 🗺️ Área (com identificação numérica)
- 🗺️ Referências geográficas de bandeiras
- 📊 Campos de área territorial em cada nível

**Impacto:** CRÍTICO
- PSF/ESF utiliza Micro-áreas (não existem!)
- Visitas domiciliares usam Distrito Sanitário
- Relatórios regionalizados não funcionam
- Impossível rastrear por cobertura geográfica

**Complexidade:** ⚠️ **MUITO ALTA** - Requer migration de dados + refactoring completo

---

### 2.2 Microáreas e Cobertura PSF
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/geral/models.py` → `Micro`

```python
class Micro(models.Model):
    area = ForeignKey(Area)
    micro = CharField  # Código da microárea (ex: "01", "02")
    
# Relaciona-se com:
class Logradouro(models.Model):
    micro = ForeignKey(Micro)  # Endereços associados a microáreas
```

**Impacto:** CRÍTICO para PSF
- Cada Agente Comunitário tem 1 microárea
- Cada microárea tem ~250-300 famílias
- Sistema atual não tem conceito de microárea!

**Complexidade:** ⚠️ **MUITO ALTA** - Requer novo schema + dados de referência

---

### 2.3 Rede Social (Equipamentos de Apoio)
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/geral/models.py` e `ssf/enderecamento/models.py`

```python
class RedeSocial(models.Model):
    nome (CharField)
    logradouro (FK)
    numero
    complemento
    cep
    latitude/longitude
    
# Exemplos: escolas, creches, CRAS, CRAM, igrejas, associações
```

**Impacto:**
- Sem mapeamento de equipamentos sociais
- Sem integração com vulnerabilidade social
- Sem dados de referência social

**Complexidade:** 🟢 **MÉDIA** - Requer model + admin interface

---

### 2.4 Endereços com Validação de CEP
**Status:** ⚠️ **Parcialmente**
**Localização Legacy:** `ssf/pessoas/models.py` → `Endereco`

```python
class Endereco(models.Model):
    logradouro (CharField)
    numero (IntegerField)
    complemento (CharField)
    bairro (CharField)
    cep (CharField - formato XXXXX-XXX)  # Com validação e formatação
    latitude/longitude (DecimalField)
    segmento (choices: Urbana, Rural, Periurbana)
    telefone (CharField)
    recados (CharField)
```

**Validação SSF:**
```python
def clean(self):
    # CEP deve ter 8 dígitos
    # Formata com hífen: XXXXX-XXX
    cep_limpo = re.sub(r'\D', '', self.cep)
    if len(cep_limpo) != 8:
        raise ValidationError({'cep': 'CEP deve ter 8 dígitos'})
    self.cep = f'{cep_limpo[:5]}-{cep_limpo[5:]}'
```

**Status Atual:** Endereço simples em Prisma sem validação

**Complexidade:** 🟢 **SIMPLES** - Requer apenas adição de validação

---

### 2.5 Classificação Geográfica por Segmento
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/pessoas/models.py` → `Endereco`

```python
segmento_esc = (
    ('1', 'Urbana'),
    ('2', 'Rural'),
    ('3', 'Periurbana'),
    ('9', 'Ignorado'),
)
```

**Impacto:**
- Sem rastreamento de zona de cobertura
- Impossível diferenciar áreas rurais de urbanas

**Complexidade:** 🟢 **SIMPLES** - Requer apenas campo enum

---

### 2.6 Longitude/Latitude em Todos os Pontos
**Status:** ⚠️ **Parcialmente**
**Localização Legacy:** Coordenadas em:
- `UnidadeDeSaude` (latitude, longitude)
- `Endereco` (latitude, longitude)
- `RedeSocial` (latitude, longitude)
- Vários outros modelos

**Status Atual:** Address tem lat/lon, mas não é usado em map

**Impacto:** 🗺️ Impossível criar mapas de cobertura

**Complexidade:** 🟢 **MÉDIA** - Requer integração com Leaflet/Mapbox

---

### 2.7 Dependências (Estabelecimentos)
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/enderecamento/models.py` → `Dependencia`

```python
class Dependencia(models.Model):
    # Estabelecimentos derivados de uma unidade de saúde
```

**Impacto:** Sem rastreamento de subunidades/dependências

**Complexidade:** 🟢 **SIMPLES** - Modelo genérico

---

### 2.8 Classe/Tipo de Estabelecimento
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/enderecamento/models.py` → `Classe`

```python
class Classe(models.Model):
    # Tipos específicos de estabelecimentos
```

**Impacto:** Sem classificação detalhada

**Complexidade:** 🟢 **SIMPLES** - Model reference

---

## 3️⃣ RELATÓRIOS COMPATÍVEIS COM SIAB

### 3.1 Produção Diária (SIAB)
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/views.py` → `producao_diaria()`

```python
def producao_diaria(request):
    # Gera relatório SIAB de produção diária
    # Inclui: consultas, equipe, INE, CNES
    # Saída: PDF via django_xhtml2pdf
```

**Estrutura de Dados:**
- Data
- Unidade (CNES)
- Profissional (CBO, CNES)
- Equipe
- Total de consultas

**Complexidade:** ⚠️ **ALTA** - Requer schema de produção + PDF generation

---

### 3.2 Produção Mensal Estratificada
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/views.py` → `producao_mensal()`

```python
# Relatório SIAB mensal com MÚLTIPLOS agrupamentos:

# Faixa etária (SIAB):
- <1 ano
- 1-4 anos  
- 5-9 anos
- 10-14 anos
- 15-19 anos
- 20-39 anos
- 40-49 anos
- 50-59 anos
- >60 anos

# Por tipo de atendimento:
- Clínica (Médica)
- Ginecologia
- Pediatria
- Urgência com Observação

# Por tipo de demanda:
- Agendado
- Demanda Imediata
- Orientação
- Continuado

# Por condições rastreadas:
- Saúde Mental
- Álcool/Drogas
- Hipertensão
- Diabetes
- Hanseníase
- Tuberculose
- DST/AIDS
- Preventivo (Pap)
- Puericultura
- Pré-natal
- Puerpério

# Por área de cobertura:
- Na área de abrangência
- Fora da área de abrangência

# Exames complementares:
- Laboratório
- Radiologia
- Citologia
- Mamografia
- Ultrassom Obstétrico
- Ultrassom Geral
- ECG
- Patologia
- Fisioterapia
- Referências
```

**Impacto:** CRÍTICO para gestão de PSF
- Sistema de incentivos SUS depende desses relatórios
- Necessário para repasse de verbas
- Auditoria de produção

**Complexidade:** ⚠️ **MUITO ALTA** - Múltiplos cálculos + agregações

---

### 3.3 Filtros por Data e Período
**Status:** ⚠️ Parcialmente existe
**Localização Legacy:** `ssf/consultas/views.py`

```python
inicial = datetime.strptime(request.POST.get('inicial'), "%Y-%m-%d")
final   = datetime.strptime(request.POST.get('final'), "%Y-%m-%d")

# Filtra por período completo
consultas = Consulta.objects.filter(consulta__gte=inicial, consulta__lt=final)
```

**Status Atual:** System tem filtros de data simples

**Complexidade:** 🟢 **SIMPLES** - Já implementado

---

### 3.4 Agregações por Micro-área
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/consultas/views.py` → `producao_mensal()`

```python
na_area = consultas.filter(pessoa__endereco__logradouro__micro__area__area = 18)
fora_de_area = (consultas.count() - na_area.count())

# Relatório mostra: Na Área vs Fora da Área
```

**Impacto:** Impossível medir cobertura de microárea

**Complexidade:** ⚠️ **ALTA** - Requer hierarquia geográfica + aggregations

---

### 3.5 Histórico de Produção
**Status:** ❌ Não existe no novo sistema

**Impacto:** Sem auditoria histórica de produção

**Complexidade:** 🟢 **MÉDIA** - Requer tabela de histórico

---

### 3.6 Relatório de Referências
**Status:** ❌ Não existe no novo sistema

```python
# Rastreamento de encaminhamentos por especialidade
ref = consultas.filter(referencia = True).count()

# Inclui especialidades de referência
```

**Complexidade:** 🟢 **MÉDIA** - Requer agregação

---

### 3.7 Geração de PDF de Relatórios
**Status:** ❌ Django xhtml2pdf não está no novo sistema
**Localização Legacy:** `ssf/consultas/views.py`

```python
return generate_pdf('relatorios/producao_diaria.html',
                    file_object=HttpResponse(content_type='application/pdf'),
                    context=locals())
```

**Alternativa Atual:** ReportLab ou similar não implementada

**Complexidade:** ⚠️ **ALTA** - Requer implementação de PDF generation

---

### 3.8 Relatório de Medicações
**Status:** ❌ Não existe no novo sistema

**Estrutura SIAB:**
- Quantidade de prescrições
- Tipo de medicação
- Medicamentos mais prescritos
- Medicamentos controlados

**Complexidade:** 🟢 **MÉDIA**

---

### 3.9 Relatório de Exames Complementares
**Status:** ❌ Não existe no novo sistema

**Estrutura:**
- Total de exames solicitados
- Por tipo (laboratório, radiologia, etc.)
- Taxa de complemento

**Complexidade:** 🟢 **MÉDIA**

---

### 3.10 Relatório de Vacinas
**Status:** ❌ Não existe no novo sistema

**Integração com Vigilancia App**
- Cobertura de vacinação
- Faixa etária
- Tipo de vacina

**Complexidade:** ⚠️ **ALTA** - Requer calendário vacinal

---

### 3.11 Relatório de Agravos
**Status:** ❌ Não existe no novo sistema

**Integração com Vigilancia App**
- Notificações (imediata/semanal)
- Órgãos notificados (MS, SES, SMS)
- Por tipo de agravo (CID-10)

**Complexidade:** ⚠️ **ALTA** - Requer vigilancia integration

---

### 3.12 Relatório de Atividades de Grupo
**Status:** ❌ Não existe no novo sistema

**Rastreamento:**
- Grupos comunitários participados
- Cooperativas
- Grupos religiosos
- Associações

**Complexidade:** 🟢 **MÉDIA**

---

## 4️⃣ VIGILÂNCIA EM SAÚDE

### 4.1 Agravos Notificáveis
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/vigilancia/models.py` → `Agravo`

```python
class Agravo(models.Model):
    agravo = CharField  # CID-10
    notif (choices: imediata, semanal)
    ms = Boolean        # Notificar Ministério da Saúde
    ses = Boolean       # Notificar SES (Secretaria Estadual)
    sms = Boolean       # Notificar SMS (Secretaria Municipal)
```

**Impacto:** Sem rastreamento de agravos notificáveis

**Complexidade:** 🟢 **MÉDIA** - Requer model + notificações

---

### 4.2 Calendário Vacinal Estruturado
**Status:** ❌ Não existe no novo sistema
**Localização Legacy:** `ssf/vigilancia/models.py` → `Vacina`

```python
class Vacina(models.Model):
    vacina (CharField)
    nome (CharField)
    descricao (TextField)
    patologias (CharField)
    eventos (TextField - eventos adversos)
    contra (TextField - contra-indicações)
    local_esc (choices: SC, IM, EV, Oral, Cutâneo)
    local (CharField)
    doses (CharField - ex: "3 doses")
    intervalo (CharField - ex: "0, 1, 6 meses")
    reforco (CharField)
    eficacia (CharField)
```

**Impacto:**
- Sem rastreamento de vacinação
- Sem integração com calendário SUS
- Sem alertas de vacinação atrasada

**Complexidade:** ⚠️ **MUITO ALTA** - Requer integração com calendário vacinal oficial

---

### 4.3 Rastreamento de Doenças Transmissíveis
**Status:** ❌ Não existe no novo sistema

**Características:**
- DST/AIDS
- Tuberculose  
- Hanseníase

**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
dst = Boolean('DST/AIDS')
tuberculose = Boolean('Tuberculose')
hanseniase = Boolean('Hanseníase')
```

**Impacto:** Sem vigilância de transmissíveis

**Complexidade:** 🟢 **SIMPLES** - Requer apenas flags

---

### 4.4 Rastreamento de DCNT
**Status:** ❌ Não existe no novo sistema

**Características:**
- Hipertensão
- Diabetes
- Obesidade (via IMC)

**Localização Legacy:** `ssf/consultas/models.py` → `Consulta`

```python
hipertensao = Boolean('Hipertensão')
diabetes = Boolean('Diabetes')
# IMC calculado a partir de peso/altura
```

**Impacto:** Sem vigilância de DCNT

**Complexidade:** 🟢 **SIMPLES** - Requer cálculos + dashboards

---

### 4.5 Indicadores Epidemiológicos
**Status:** ❌ Não existe no novo sistema

**Indicadores SIAB:**
- Cobertura de consultas
- Cobertura de pré-natal
- Cobertura de vacinação
- Incidência de doenças rastreadas
- Taxa de referência

**Complexidade:** ⚠️ **MUITO ALTA** - Requer modelo de indicadores + cálculos

---

### 4.6 Ficha de Vigilância (Vigilância Ativa)
**Status:** ❌ Não existe no novo sistema

**Estrutura:**
- Paciente com agravo
- Sintomas
- Contatos
- Desfecho

**Complexidade:** ⚠️ **ALTA** - Requer novo modelo + workflow

---

### 4.7 Integração com Notificação de Agravos (SINAN)
**Status:** ❌ Não existe no novo sistema

**Features:**
- Exportação em formato SINAN
- Integração com SES/SMS

**Complexidade:** ⚠️ **MUITO ALTA** - Requer integração com sistema governamental

---

### 4.8 Dashboard de Vigilância
**Status:** ❌ Não existe no novo sistema

**Indicadores em Tempo Real:**
- Casos confirmados
- Casos suspeitos
- Óbitos
- Incidência por 100k

**Complexity:** ⚠️ **ALTA** - Requer UI + real-time updates

---

### 4.9 Alertas de Surtos
**Status:** ❌ Não existe no novo sistema

**Features:**
- Detecção automática de aumentos
- Notificações
- Ativação de protocolo

**Complexity:** ⚠️ **MUITO ALTA** - Requer algoritmos de detecção

---

## 📊 TABELA CONSOLIDADA

| **Categoria** | **Feature** | **Status** | **Impacto** | **Complexidade** | **Prioridade** |
|---|---|---|---|---|---|
| **Dados Clínicos** | Pré-Natal | ❌ | Crítico | ALTA | 🔴 |
| | História Ginecológica | ❌ | Alto | MÉDIA | 🟠 |
| | Atestados | ❌ | Crítico | ALTA | 🔴 |
| | Encaminhamentos | ❌ | Alto | ALTA | 🟠 |
| | Prescrições Classificadas | ⚠️ | Alto | ALTA | 🟠 |
| | Avaliação Nutricional | ❌ | Médio | MÉDIA | 🟡 |
| | Gestação | ⚠️ | Alto | MÉDIA | 🟠 |
| | DCNT | ❌ | Crítico | SIMPLES | 🔴 |
| | Tipo de Atendimento | ❌ | Alto | SIMPLES | 🟠 |
| | Saúde Mental | ❌ | Alto | SIMPLES | 🟠 |
| | Exames Complementares | ⚠️ | Médio | MÉDIA | 🟡 |
| | Sociodemografia | ❌ | Crítico | ALTA | 🔴 |
| | Cobertura de Saúde | ❌ | Médio | SIMPLES | 🟡 |
| **Localização** | Hierarquia Geográfica | ❌ | **CRÍTICO** | MUITO ALTA | 🔴 |
| | Microáreas | ❌ | **CRÍTICO** | MUITO ALTA | 🔴 |
| | Rede Social | ❌ | Alto | MÉDIA | 🟠 |
| | Validação CEP | ⚠️ | Médio | SIMPLES | 🟡 |
| | Segmento Geográfico | ❌ | Médio | SIMPLES | 🟡 |
| | Coordenadas (Integração) | ⚠️ | Alto | MÉDIA | 🟠 |
| | Dependências | ❌ | Baixo | SIMPLES | 🟢 |
| | Classe/Tipo | ❌ | Baixo | SIMPLES | 🟢 |
| **Relatórios** | Produção Diária | ❌ | Crítico | ALTA | 🔴 |
| | Produção Mensal | ❌ | **CRÍTICO** | MUITO ALTA | 🔴 |
| | Filtros por Período | ⚠️ | Médio | SIMPLES | 🟢 |
| | Agregação por Microárea | ❌ | **CRÍTICO** | ALTA | 🔴 |
| | Histórico de Produção | ❌ | Médio | MÉDIA | 🟡 |
| | Relatório de Referências | ❌ | Médio | MÉDIA | 🟡 |
| | PDF Generation | ❌ | Alto | ALTA | 🟠 |
| | Relatório de Medicações | ❌ | Médio | MÉDIA | 🟡 |
| | Relatório de Exames | ❌ | Médio | MÉDIA | 🟡 |
| | Relatório de Vacinas | ❌ | Alto | ALTA | 🟠 |
| | Relatório de Agravos | ❌ | Alto | ALTA | 🟠 |
| | Relatório de Grupos | ❌ | Baixo | MÉDIA | 🟢 |
| **Vigilância** | Agravos Notificáveis | ❌ | Alto | MÉDIA | 🟠 |
| | Calendário Vacinal | ❌ | **CRÍTICO** | MUITO ALTA | 🔴 |
| | Doenças Transmissíveis | ❌ | Alto | SIMPLES | 🟠 |
| | DCNT | ❌ | Crítico | SIMPLES | 🔴 |
| | Indicadores Epidemiológicos | ❌ | **CRÍTICO** | MUITO ALTA | 🔴 |
| | Ficha de Vigilância | ❌ | Alto | ALTA | 🟠 |
| | Integração SINAN | ❌ | Alto | MUITO ALTA | 🔴 |
| | Dashboard Vigilância | ❌ | Alto | ALTA | 🟠 |
| | Alertas de Surtos | ❌ | Crítico | MUITO ALTA | 🔴 |

---

## 🚨 TOP 10 PRIORIDADES (Impacto x Complexidade)

### FASE 1 - CRÍTICO (Restaura funcionalidade básica)
1. **Hierarquia Geográfica Completa** - BLOQUEIA tudo
2. **Microáreas** - BLOQUEIA PSF
3. **Produção Mensal SIAB** - BLOQUEIA repasse de verbas
4. **Pré-Natal** - BLOQUEIA gestantes
5. **Atestados** - BLOQUEIA assinatura digital já implementada
6. **DCNT Rastreamento** - BLOQUEIA vigilância
7. **Sociodemografia** - BLOQUEIA vulnerabilidade
8. **Calendário Vacinal** - BLOQUEIA vacinação
9. **Indicadores Epidemiológicos** - BLOQUEIA gestão
10. **SINAN Integration** - BLOQUEIA vigilância oficial

### FASE 2 - IMPORTANTE (Funcionalidades secundárias)
- História Ginecológica
- Encaminhamentos Estruturados
- Prescrições Classificadas
- Rede Social (Equipamentos)
- Relatório de Vacinas
- Agravos Notificáveis

### FASE 3 - COMPLEMENTAR (Melhorias)
- Avaliação Nutricional
- Tipo de Atendimento
- Saúde Mental
- Exames Complementares
- Cobertura de Saúde

---

## 📝 NOTAS TÉCNICAS

### Decisões de Arquitetura Recomendadas

1. **Hierarquia Geográfica:**
   - Migration de dados de SSF→Prisma
   - Manter compatibilidade SIAB (9 níveis)
   - Adicionar geospatial indexing (PostGIS)

2. **Microáreas:**
   - Novo model `MicroArea` com relacionamento N:N com `Address`
   - Cada microárea tem área territorial em hectares
   - Cada ACS tem 1 microárea

3. **Relatórios SIAB:**
   - Criar jobs de agregação scheduled (diário/mensal)
   - Cache de resultados
   - Exportação em JSON + PDF

4. **Vigilância:**
   - Separar em novo app (`health-surveillance`)
   - Integração com APIs de SINAN (estado/país)
   - Webhooks para alertas

5. **PDF Generation:**
   - Utilizar `@react-pdf/renderer` para Next.js
   - Templates para cada tipo de relatório/documento
   - Assinatura digital com certificado A1

---

## 🔄 ROADMAP PROPOSTO

```
T1 (Mês 1-2): Dados Críticos
├─ Hierarquia Geográfica
├─ Microáreas
└─ DCNT Rastreamento

T2 (Mês 2-3): PSF Core
├─ Produção Mensal SIAB
├─ Pré-Natal
├─ Atestados
└─ Sociodemografia

T3 (Mês 3-4): Vigilância
├─ Calendário Vacinal
├─ Indicadores Epidemiológicos
├─ SINAN Integration
└─ Agravos

T4+ (Mês 5+): Complementos
├─ Encaminhamentos
├─ Prescrições Classificadas
├─ Rede Social
└─ Dashboards
```

---

## 📌 CONCLUSÃO

O código legado do SSF contém **42 features não portadas** que representam funcionalidades essenciais para o Sistema de Informação de Atenção Básica (SIAB) em PSF/ESF.

**Bloqueadores Críticos:**
- ❌ Hierarquia geográfica inadequada
- ❌ Microáreas não existem
- ❌ Relatórios SIAB não existem
- ❌ Vigilância em saúde minimalista

**Recomendação:** Priorizar Phase 1 (Dados Críticos) para restaurar funcionalidade de PSF antes de implementar novas features.

---

**Documento preparado por:** Sistema de Análise Legada  
**Data:** Dezembro 2025  
**Próxima Revisão:** Após implementação de Phase 1
