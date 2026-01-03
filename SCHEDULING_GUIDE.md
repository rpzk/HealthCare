# Guia de Agendamento de Plantões - Interface Intuitiva

## 📋 Visão Geral

A interface de **Agendamento de Plantões em Lote** foi criada para simplificar significativamente o processo de bloquear múltiplos dias e horários no calendário. Em vez de inserir um plantão por vez, você pode agora:

✅ **Adicionar múltiplos plantões de uma vez**
✅ **Usar templates de horários pré-definidos ou criar seus próprios**
✅ **Importar datas diretamente de Excel/Sheets**
✅ **Selecionar datas visualmente no calendário**

---

## 🎯 Como Acessar

1. Vá para **Configurações** → aba **Agendamento**
2. Procure pela seção azul: **"Agendamento de Plantões em Lote"** (no topo)
3. Escolha uma das 3 formas de adicionar datas

---

## 🔧 Opção 1: Calendário Visual (Mais Intuitivo)

### Seleção Rápida

A aba **Calendário** oferece botões de atalho:

| Botão | O que faz |
|-------|----------|
| **Dias Úteis** | Seleciona seg-sex (segunda a sexta) do mês |
| **Fins de Semana** | Seleciona sab-dom (sábados e domingos) |
| **Mês Inteiro** | Seleciona todos os dias do mês |
| **Limpar** | Remove todas as seleções |

### Seleção Manual

- Clique nos números do calendário para adicionar/remover dias
- Pode navegar entre meses com as setas
- O resumo no topo mostra quantos dias estão selecionados

**Exemplo Prático:**
```
Você trabalha plantões:
- Seg-Sex: 7h-19h
- Sábado: 7h-13h
- Domingo: folga

1. Clique em "Dias Úteis" → seleciona seg-sex
2. Clique manualmente em 4 sábados que você trabalha
3. Selecione o turno "7-13"
4. Clique "Adicionar 20+ Plantões"
```

---

## 📊 Opção 2: Importar de Excel/Sheets (Mais Rápido para Muitos Dias)

### Passo a Passo

#### **1. Copiar datas do Excel/Sheets**

Abra sua planilha e copie uma coluna com as datas:

```
01/01/2026
02/01/2026
03/01/2026
05/01/2026
06/01/2026
...
```

**Formatos Aceitos:**
- `DD/MM/YYYY` (01/12/2025)
- `YYYY-MM-DD` (2025-12-01)
- `DD-MM-YYYY` (01-12-2025)
- `DD.MM.YYYY` (01.12.2025)

#### **2. Colar na interface**

1. Vá para aba **"Importar"**
2. Cole o conteúdo do Excel no campo de texto
3. **Ou clique em "Abrir arquivo"** se tiver um `.txt` ou `.csv`
4. O sistema valida e mostra quantas datas foram encontradas

#### **3. Revisar e importar**

```
✅ 25 data(s) válida(s) encontrada(s)
```

Se houver erros, verá mensagens tipo:
```
Linha 5: "32/01/2026" - formato inválido
```

---

## ⏰ Opção 3: Templates de Horários

### Horários Pré-configurados

Clique em qualquer turno para selecioná-lo:

| Template | Horário | Casos de Uso |
|----------|---------|-------------|
| **7-19** | 07:00 - 19:00 | Plantão tradicional (Manhã/Tarde) |
| **19-7** | 19:00 - 07:00 | Plantão noturno |
| **10-22** | 10:00 - 22:00 | Tarde/Noite estendida |
| **7-13** | 07:00 - 13:00 | Turno de manhã |
| **13-19** | 13:00 - 19:00 | Turno de tarde |
| **17-22** | 17:00 - 22:00 | Noite curta |
| **8-16** | 08:00 - 16:00 | Turno comercial |
| **6-14** | 06:00 - 14:00 | Turno de madrugada |

### Criar Seu Próprio Template

1. Clique no botão **"+ Novo Turno"** (último quadrado da grade)
2. Preencha:
   - **Nome**: "Meu Turno Personalizado" (ex: "15-23")
   - **Início**: selecione a hora
   - **Fim**: selecione a hora
3. Clique **"Criar Turno"**

Pronto! Seu turno fica salvo para usar novamente.

**Exemplo:**
```
Nome: 15-23 (Jantaristas)
Início: 15:00
Fim: 23:00
```

---

## ✨ Resumo: Passo a Passo Completo

### Cenário: Adicionar 15 plantões de julho/agosto

#### **Método Rápido (2 minutos):**

```bash
# 1. Abrir calendário
# 2. Navegar para JULHO
# 3. Clique em "Dias Úteis" → seleciona 22 dias
# 4. Navegar para AGOSTO  
# 5. Clique em "Dias Úteis" novamente → adiciona mais 23 dias
# 6. Selecionar turno "7-19"
# 7. Clicar "Adicionar 45 Plantões"
# ✅ Pronto em ~2 minutos!
```

#### **Método com Importação (1 minuto):**

```bash
# 1. Extrair datas do Soffia (copiar coluna)
# 2. Ir para aba "Importar"
# 3. Colar datas
# 4. Validar (mostra quantas encontrou)
# 5. Selecionar turno
# 6. Clicar "Importar"
# ✅ Pronto em ~1 minuto!
```

---

## 📊 Indicadores e Status

### Enquanto você seleciona:

```
📅 14 data(s) selecionada(s) · 10 dia(s) útil(is) · 4 dia(s) fim de semana
```

### Quando está pronto para adicionar:

```
🟢 Turno selecionado: 7-19 (Manhã/Tarde) (07:00 - 19:00)
🟢 Pronto para adicionar: 14 plantão(ões) de 07:00 às 19:00
```

### Após adicionar:

```
✅ 14 plantão(õ)es adicionado(s) com sucesso!
```

---

## 🔄 Adicionar Mais Plantões

Você pode continuar adicionando quantos plantões quiser:

1. **Limpar** as datas atuais (clique "Limpar" ou "Mês Inteiro")
2. Selecionar **novas datas**
3. Escolher um **turno diferente** (ex: 19-7 para noites)
4. Clicar **"Adicionar X Plantões"** novamente

Cada batch é independente. Se uma data já estiver bloqueada, o sistema avisa.

---

## ⚠️ Dicas e Truques

### Dica 1: Padrão Repetitivo

Se você trabalha sempre **seg-sex 7-19** e **sábado 7-13**:

```
1º batch: Clique "Dias Úteis" + selecione turno "7-19"
2º batch: Navegar próximo mês, clique apenas sábados + turno "7-13"
```

### Dica 2: Importação com Muitas Datas

Se tem 100+ datas em Excel:

```
1. Copie a coluna inteira do Excel
2. Cole na aba "Importar"
3. Não precisa validar linha por linha - o sistema valida tudo
4. Vê o total: "425 data(s) válida(s)"
5. Seleciona turno padrão
6. Um clique e adiciona tudo!
```

### Dica 3: Trabalho Noturno

Para plantões que cruzam dias (ex: 19-7):

```
Horário: 19:00 - 07:00 (próximo dia)
Sistema detecta automaticamente ✓
Selecionar turno "19-7" cuida disso
```

### Dica 4: Revisar Antes

Vá para aba **"Resumo"** para revisar todas as datas antes de adicionar:

```
📋 Resumo de Datas Selecionadas
14 datas será(ão) bloqueada(s)

[01/07/2026] [02/07/2026] [03/07/2026] ...
```

---

## 🛠️ Ver Plantões Registrados

Rolar para baixo mostra a seção:

```
📅 Plantões Registrados (127)

Seus bloqueios de agenda atuais.
Use a aba anterior para adicionar mais.

Últimos plantões adicionados:
[01/07] [02/07] [03/07] ... [+123]
```

---

## ❌ Remover Plantões

Se precisar remover um plantão individual:

1. Rolar para seção **"Dias Bloqueados"** (mais abaixo)
2. Encontre a data
3. Clique no ícone **🗑️ Lixo**
4. Confirme

**Nota:** Para remover vários de uma vez, use a interface de calendário anterior.

---

## 🚀 Comparação: Antes vs Depois

### Antes (Método Manual)

```
❌ Clique em "Bloquear Dias"
❌ Preenche Data de Início: 01/01/2026
❌ Preencha Data de Fim: 01/01/2026
❌ Seleciona Tipo: "Plantão"
❌ Clica "Bloquear"
❌ Repete 50x para 50 dias... 😫
```

**Tempo: ~15-20 minutos para 50 plantões**

### Depois (Método em Lote)

```
✅ Vai para aba "Calendário"
✅ Clica "Dias Úteis"
✅ Navega 2 meses (30 segundos)
✅ Clica "Dias Úteis" novamente
✅ Seleciona turno "7-19"
✅ Clica "Adicionar 45 Plantões"
✅ Pronto!
```

**Tempo: ~2-3 minutos para 50 plantões** ⚡

---

## 📞 Suporte

Se encontrar problemas:

1. **Datas não importam**: Verifique o formato (veja "Formatos Aceitos")
2. **Turno não fica selecionado**: Clique diretamente no botão azul
3. **Erro ao adicionar**: Pode ser data duplicada ou dados inválidos

Dúvidas? Abra um ticket ou consulte a documentação completa em `/docs/SCHEDULING_SYSTEM_IMPLEMENTATION.md`

---

**Última atualização:** Janeiro 2026
**Status:** ✅ Pronto para produção
