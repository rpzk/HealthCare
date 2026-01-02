# Dashboard de Análise de Questionários - Guia de Uso

## 📋 Visão Geral

O novo **Dashboard de Análise de Questionários** foi desenvolvido para proporcionar uma forma intuitiva e centralizada de **monitorar, analisar e receber notificações sobre os questionários dos pacientes**.

## 🎯 Funcionalidades Principais

### 1. **Visão Geral Analítica** 📊
Acesse em: `/admin/questionnaire-analytics`

#### Métricas em Tempo Real:
- **Total Enviados**: Quantidade de questionários enviados nos últimos 7, 30 ou 90 dias
- **Concluídos**: Número de questionários respondidos com taxa de conclusão percentual
- **Pendentes**: Questionários aguardando resposta do paciente
- **Tempo Médio**: Tempo médio de preenchimento em minutos

#### Gráficos Visuais:
- **Tendência**: Visualiza questionários enviados vs completados ao longo do tempo
- **Por Sistema Terapêutico**: Distribuição por Ayurveda, Homeopatia, MTC, etc.
- **Distribuição por Status**: Comparação visual de concluídos, pendentes e expirados

#### Como Usar:
1. Clique em "Análise de Questionários" no menu admin
2. Selecione o período (7D, 30D ou 90D)
3. Analise as métricas e gráficos
4. Use os dados para tomar decisões sobre estratégia de questionários

### 2. **Centro de Notificações** 🔔
Acesse em: `/admin/questionnaire-analytics` → Aba "Notificações"

#### Tipos de Notificação:
- 🟢 **Questionário Respondido**: Quando um paciente completa um questionário
- 📬 **Questionário Enviado**: Quando um novo questionário é enviado
- ⚠️ **Questionário Expirado**: Quando o prazo de resposta expira
- 💜 **Análise IA Pronta**: Quando a análise automática está disponível

#### Filtros Disponíveis:
- **Não Lidas**: Apenas notificações não visualizadas
- **Lidas**: Apenas notificações já visualizadas
- **Todas**: Todas as notificações

#### Ações Disponíveis:
- ✅ **Marcar como Lido**: Marca uma notificação individualmente como lida
- 👁️ **Marcar Todas como Lidas**: Marca todas as notificações não lidas como lidas em uma ação
- 🗑️ **Deletar**: Remove a notificação do painel
- 🔗 **Ver Detalhes**: Acessa o questionário ou paciente relacionado

#### Como Usar:
1. Acesse o Centro de Notificações
2. Filtre por status (não lidas, lidas, todas)
3. Clique em "Ver Detalhes" para acessar o questionário
4. Marque como lido quando revisar
5. Delete notificações antigas para manter organizado

### 3. **Insights Inteligentes** 🧠
Acesse em: `/admin/questionnaire-analytics` → Aba "Insights IA"

#### Tipos de Insight:
1. **Preocupações** (🔴 Vermelha)
   - Problemas ou sintomas alarmantes identificados
   - Requerem ação imediata
   - Severity: Alta, Média ou Baixa

2. **Melhorias** (🟢 Verde)
   - Áreas onde o paciente está progredindo bem
   - Reforçam comportamentos positivos
   - Severity: Baixa (informativo)

3. **Padrões Identificados** (🟣 Roxa)
   - Comportamentos ou tendências detectadas pela IA
   - Úteis para acompanhamento longitudinal
   - Severity: Variável

4. **Recomendações** (🟡 Laranja)
   - Sugestões de ações baseadas nas respostas
   - Orientam próximos passos
   - Severity: Variável

#### Filtragem por Prioridade:
- **Alta Prioridade**: Requer ação imediata (vermelho)
- **Média Prioridade**: Requer acompanhamento (amarelo)
- **Baixa Prioridade**: Informativo (azul)
- **Todas**: Todos os insights

#### Informações Mostradas:
- 👤 **Paciente**: Nome do paciente
- 📋 **Questionário**: Nome do questionário respondido
- 📅 **Data**: Quando o insight foi detectado
- 📊 **Métricas**: Valores relacionados ao insight
- 💡 **Ação Sugerida**: Recomendação específica
- 🔗 **Botão de Ação**: Link direto para o paciente/questionário

#### Como Usar:
1. Acesse a aba "Insights IA"
2. Revise os alertas de "Alta Prioridade" primeiro
3. Leia a descrição e a ação sugerida
4. Clique "Ver Questionário" para acessar os dados completos
5. Tome ação conforme recomendado (contactar paciente, ajustar tratamento, etc.)

---

## 🔔 Sistema de Notificações Integrado

### Onde Receber Notificações:

#### 1. **Panel no Dashboard** (Este Dashboard)
- Visualização centralizada de todas as notificações
- Acesso em: `/admin/questionnaire-analytics`

#### 2. **Widget no Dashboard Principal**
- Resumo rápido de alertas
- Mostra contagem de:
  - Questionários pendentes
  - Análises aguardando revisão
  - Insights de alta prioridade

#### 3. **Notificações de Sistema** (Futuro)
- Email (quando configurado)
- WhatsApp (quando configurado)
- Push notifications (quando disponível)

---

## 🚀 Fluxo Recomendado de Uso

### Diariamente:
1. ✅ Acesse o Dashboard de Análise
2. ✅ Revise a aba "Notificações" - Não Lidas
3. ✅ Marque notificações como lidas após revisar
4. ✅ Acesse a aba "Insights IA" para alta prioridade

### Semanalmente:
1. ✅ Analise as tendências (Visão Geral)
2. ✅ Verifique taxa de conclusão por sistema terapêutico
3. ✅ Identifique padrões entre pacientes
4. ✅ Revise todos os insights pendentes

### Mensalmente:
1. ✅ Examine o relatório de 30 dias
2. ✅ Compare com períodos anteriores
3. ✅ Identifique sistemas com baixa adesão
4. ✅ Tome decisões sobre ajustes de estratégia

---

## 📱 Acessibilidade

O dashboard é totalmente **responsivo** e funciona em:
- 💻 Desktops
- 📱 Tablets
- 📲 Smartphones

---

## 🔐 Permissões de Acesso

O Dashboard de Análise de Questionários está disponível para:
- 👨‍⚕️ Médicos
- 👩‍⚕️ Enfermeiros
- 💆 Terapeutas
- 🔧 Administradores

Outros usuários não conseguirão acessar essas análises.

---

## 💡 Dicas Práticas

### Para Aumentar Taxa de Conclusão:
1. Defina prazos claros nos questionários
2. Envie lembretes via WhatsApp/Email
3. Use questionários mais curtos (menos de 10 minutos)
4. Acompanhe os "Pendentes" regularmente

### Para Aproveitar os Insights:
1. Revise insights logo após questionário ser respondido
2. Tome ações conforme recomendações
3. Documente as ações tomadas no prontuário do paciente
4. Crie ciclos de feedback com pacientes

### Para Melhorar Dados:
1. Escolha os questionários mais relevantes para cada paciente
2. Evie muitos questionários simultaneamente
3. Análise as respostas dentro de 24-48 horas
4. Use resultados para personalizar tratamentos

---

## 🆘 Suporte e Dúvidas

Se tiver dúvidas sobre:
- **Notificações**: Acesse o Centro de Notificações
- **Análises**: Consulte os Insights IA
- **Dados**: Verifique o questionário original do paciente
- **Problemas Técnicos**: Contate o suporte técnico

---

## 📊 Integração com Outras Áreas

Este dashboard **integra-se com**:
- ✅ Perfil do Paciente (acesso direto)
- ✅ Histórico de Questionários
- ✅ Notificações do Sistema
- ✅ Análise IA de Respostas
- ✅ Prontuário Eletrônico

---

**Versão 1.0** | Última atualização: 2026-01-02
