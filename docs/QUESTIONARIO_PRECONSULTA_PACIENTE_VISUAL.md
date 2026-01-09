# Questionários – Visão do Paciente (como aparece no sistema)

Este documento descreve como o **paciente** vê e responde questionários enviados pelo profissional dentro do HealthCare.

Escopo:
- Fluxo de acesso via link (token)
- Estrutura em seções/categorias
- Tipos de pergunta usados
- Experiência de preenchimento (pausar, progresso, finalizar)

Sem dados inventados:
- Este documento não inclui respostas simuladas nem exemplos de preenchimento.
- O conteúdo do questionário aqui é o texto real do template “Questionário Integrativo – Anamnese Pré-Consulta”.

---

## 1) Como o paciente recebe e acessa

1. O profissional envia um questionário para o paciente.
2. Se o paciente tiver e-mail cadastrado, o sistema envia uma mensagem contendo um **link de acesso**.
3. O paciente abre o link e acessa uma página pública do questionário (por token), sem precisar navegar pelo painel interno.

O questionário possui:
- **Prazo** (expiração), quando configurado no envio.
- **Status** (ex.: pendente, em progresso, concluído).

---

## 2) O que aparece na tela do paciente

Ao abrir o questionário, o paciente vê:
- **Título do questionário**
- **Introdução ao paciente** (texto do template)
- **Tempo estimado** (quando disponível)
- **Barra de progresso** (quando habilitada no template)
- Navegação por **seções/categorias**

### Introdução (texto exibido)

> Este questionário tem como objetivo ampliar a compreensão do seu processo de saúde-doença de forma integral (corpo, mente, emoções, biografia e contexto). Ele não substitui a consulta, mas permite que ela seja mais profunda, acolhedora e eficiente.
>
> Responda com calma, honestidade e no seu tempo. Não há respostas certas ou erradas.

---

## 3) Estrutura do questionário (seções e perguntas)

O questionário é apresentado em **seções** (categorias). Dentro de cada seção, o paciente responde as perguntas correspondentes.

Observação: a configuração atual deste template marca as perguntas como **não obrigatórias** (permitindo que o paciente avance mesmo se deixar em branco).

### 3.1 Identificação e contexto
- Nome completo:
- Data de nascimento:
- Profissão / atividade principal:
- Estado civil / configuração familiar:
- Quem mora com você?
- Como é um dia típico na sua vida?

### 3.2 Queixa principal e objetivos
- O que motivou você a buscar esta consulta agora?
- Quando isso começou?
- O que você espera do acompanhamento integrativo?
- Se sua saúde estivesse ideal daqui a 1 ano, como ela estaria?

### 3.3 História da condição atual
- Descreva seus sintomas principais:
- Intensidade (0–10):
- Frequência:
- O que melhora?
- O que piora?
- Há relação com emoções, clima, alimentação, ciclo menstrual, estresse ou horários do dia?

### 3.4 Antecedentes pessoais
- Doenças importantes ao longo da vida:
- Internações / cirurgias:
- Traumas físicos relevantes:
- Uso atual de medicamentos (dose e horário):
- Uso prévio de medicamentos de longo prazo:

### 3.5 Antecedentes familiares
- Doenças relevantes em familiares (pais, avós, irmãos):
- Padrões repetitivos (ex.: câncer, depressão, diabetes, doenças autoimunes):

### 3.6 Sono
- Horário que dorme / acorda:
- Qualidade do sono:
- Sonhos frequentes?

### 3.7 Alimentação
- Como você descreveria sua alimentação?
- Horários das refeições:
- Preferências e aversões alimentares:
- Consumo de açúcar, café, álcool, ultraprocessados:

### 3.8 Atividade física
- Tipo:
- Frequência:
- Como se sente após se exercitar?

### 3.9 Digestão e eliminação
- Apetite:
- Estufamento / gases:
- Azia / refluxo:
- Funcionamento intestinal:
- Características das fezes:

### 3.10 Aspectos emocionais e mentais
- Como você descreveria seu estado emocional atual?
- Ansiedade, tristeza, irritabilidade, apatia?
- Eventos marcantes recentes:
- Como você lida com conflitos?

### 3.11 Espiritualidade e sentido
- Você possui alguma prática espiritual ou religiosa?
- O que dá sentido à sua vida hoje?
- Você sente que está alinhado(a) com seu propósito?

### 3.12 Anamnese Antroposófica
- Como você percebe o ritmo na sua vida (sono, alimentação, trabalho, lazer)?
- Você se considera mais ativo(a) ou mais contemplativo(a)?
- Sensação predominante: calor ou frio?
- Como reage a doenças (febre alta, prostração, pouca reação)?
- Doenças marcantes na infância?
- Eventos biográficos importantes por fases da vida (0–7 / 7–14 / 14–21 / adulto):

### 3.13 Anamnese Ayurvédica
- Corpo mais leve/seco ou pesado/úmido?
- Tendência a frio ou calor?
- Pele seca, oleosa ou mista?
- Fome regular?
- Digestão lenta ou rápida?
- Sonolência após comer?
- Ansiedade, medo, insônia (Vata)?
- Irritabilidade, inflamação, calor (Pitta)?
- Letargia, ganho de peso, apego (Kapha)?

### 3.14 Anamnese Homeopática
- Sintoma mais incômodo (descreva detalhadamente):
- Sensações específicas (pontada, queimação, peso, vazio):
- Modalidades: melhora/piora com frio, calor, repouso, movimento?
- Horário do dia em que piora:
- Medos marcantes:
- Sonhos recorrentes:
- Padrões emocionais desde a infância:

### 3.15 Anamnese de Medicina Chinesa (MTC)
- Sensação de frio ou calor nas extremidades?
- Sudorese (espontânea, noturna, ausente):
- Sede (muita, pouca, prefere quente/frio):
- Emoção predominante (raiva, preocupação, medo, tristeza):
- Dores: local, tipo, migração:
- Ritmo intestinal e urinário:

### 3.16 Fitoterapia (Ervas Brasileiras e do Mundo)
- Já utilizou plantas medicinais?
- Quais fizeram bem?
- Quais não tolerou?
- Uso de chás no dia a dia:
- Sensibilidade a aromas, amargos, estimulantes ou sedativos:

### 3.17 Acupuntura
- Dores crônicas?
- Pontos sensíveis ao toque?
- Histórico de traumas energéticos (quedas, acidentes, cirurgias):
- Sensação de bloqueio ou estagnação em alguma região do corpo?

### 3.18 Astromedicina
- Data, hora e local de nascimento (se souber):
- Eventos de saúde marcantes ao longo da vida (idade aproximada):
- Fases da vida com mais adoecimento ou expansão:
- Você percebe relação entre crises de saúde e fases emocionais?

### 3.19 Ortomolecular / Metabólica
- Fadiga persistente?
- Queda de cabelo?
- Unhas fracas?
- Cãibras, tremores, formigamentos?
- Infecções de repetição?
- Uso prévio de suplementos:
- Exames laboratoriais recentes:

### 3.20 Encerramento
- Há algo importante sobre você que não foi perguntado?
- Algo que você sente que seu corpo quer comunicar?

---

## 4) Tipos de pergunta (como o paciente responde)

Este template usa principalmente **texto livre**, além de:
- **Escala numérica (0–10)**: “Intensidade (0–10):”
- **Sim/Não**: “Sonhos frequentes?”

---

## 5) Pausar, continuar e finalizar

Conforme a configuração do template:
- O paciente pode **pausar** e continuar depois (quando `allowPause` está habilitado).
- O sistema pode mostrar **progresso** (quando `showProgress` está habilitado).
- Ao finalizar, o questionário muda para **concluído**, e as respostas ficam disponíveis para o profissional.

---

## 6) Envio para paciente (o que o profissional faz, em alto nível)

1. O profissional escolhe o template “Questionário Integrativo – Anamnese Pré-Consulta”.
2. Seleciona o paciente e define (opcionalmente) vínculo com consulta e prazo.
3. O sistema cria um `PatientQuestionnaire` com `accessToken`.
4. O paciente recebe o link por e-mail (se houver e-mail cadastrado).

---

## 7) Observações práticas

- Se o paciente não tiver e-mail cadastrado, o envio por e-mail não acontece (mas o questionário pode existir no sistema).
- O prazo de expiração depende do valor configurado no envio.
