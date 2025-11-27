# 📖 Manual do Usuário - HealthCare System

## Bem-vindo ao HealthCare

O HealthCare é um sistema de prontuário eletrônico moderno, desenvolvido para facilitar o dia a dia de profissionais de saúde em clínicas, unidades básicas de saúde e consultórios.

---

## Índice

1. [Primeiros Passos](#primeiros-passos)
2. [Recepção](#recepção)
3. [Pacientes](#pacientes)
4. [Consultas](#consultas)
5. [Prescrições](#prescrições)
6. [Exames](#exames)
7. [Prontuário Eletrônico](#prontuário-eletrônico)
8. [Assistente de IA](#assistente-de-ia)
9. [Relatórios](#relatórios)
10. [Configurações](#configurações)
11. [Perguntas Frequentes](#perguntas-frequentes)

---

## Primeiros Passos

### Login

1. Acesse o sistema pelo navegador (Chrome, Firefox, Safari ou Edge)
2. Na tela de login, insira seu **email** e **senha**
3. Clique em **Entrar**

> 💡 **Dica:** Você pode instalar o app no celular ou computador clicando em "Instalar" na barra do navegador.

### Navegação

O menu principal fica na lateral esquerda:

| Ícone | Módulo | Descrição |
|-------|--------|-----------|
| 🏠 | Dashboard | Visão geral do dia |
| 👥 | Pacientes | Cadastro e busca de pacientes |
| 📋 | Consultas | Agendamentos e atendimentos |
| 💊 | Prescrições | Receitas médicas |
| 🔬 | Exames | Solicitação e resultados |
| 📊 | Relatórios | Estatísticas e exportação |
| ⚙️ | Configurações | Preferências do sistema |

---

## Recepção

O módulo de recepção é a porta de entrada do sistema.

### Fila de Atendimento

1. Acesse **Recepção** no menu
2. Visualize a lista de pacientes agendados para o dia
3. Use os filtros para buscar por nome, horário ou médico

### Check-in do Paciente

1. Localize o paciente na fila
2. Clique em **Check-in**
3. Confirme os dados do paciente
4. O status muda para "Aguardando atendimento"

### Agendamento Rápido

1. Clique em **+ Novo Agendamento**
2. Busque o paciente pelo nome ou CPF
3. Selecione o profissional e horário
4. Clique em **Confirmar**

---

## Pacientes

### Cadastrar Novo Paciente

1. Acesse **Pacientes** → **Novo Paciente**
2. Preencha os dados obrigatórios:
   - Nome completo
   - Data de nascimento
   - CPF (opcional, mas recomendado)
3. Adicione informações de contato
4. Clique em **Salvar**

### Buscar Paciente

1. Use a barra de busca no topo
2. Digite nome, CPF ou parte do nome
3. Clique no paciente para ver detalhes

### Ficha do Paciente

A ficha mostra:

- **Dados Pessoais:** Nome, idade, contato
- **Histórico:** Consultas anteriores
- **Alergias:** Medicamentos e substâncias
- **Medicamentos:** Em uso contínuo
- **Exames:** Histórico de resultados

---

## Consultas

### Iniciar Atendimento

1. Na fila de recepção, clique em **Iniciar Consulta**
2. Ou acesse **Consultas** → **Consultas de Hoje**
3. Selecione o paciente aguardando

### Durante a Consulta

A tela de consulta possui abas:

#### 📝 Anamnese

- Queixa principal
- História da doença atual
- Antecedentes pessoais e familiares

#### 🩺 Exame Físico

- Sinais vitais (PA, FC, FR, Temp, SpO2)
- Exame segmentar
- Achados relevantes

#### 💊 Conduta

- Diagnóstico (com busca CID-10)
- Prescrição de medicamentos
- Solicitação de exames
- Orientações

#### 🗣️ Transcrição (IA)

- Clique no **microfone** para gravar
- A IA transcreve automaticamente
- Revise e edite antes de salvar

### Finalizar Consulta

1. Revise todas as informações
2. Clique em **Finalizar Consulta**
3. Assine digitalmente se necessário
4. Imprima ou envie documentos ao paciente

---

## Prescrições

### Criar Prescrição

1. Durante a consulta, acesse a aba **Conduta**
2. Clique em **Nova Prescrição**
3. Busque o medicamento pelo nome
4. Preencha:
   - Dose
   - Frequência
   - Duração
   - Instruções especiais
5. Adicione mais medicamentos se necessário
6. Clique em **Salvar**

### Verificação de Interações

O sistema verifica automaticamente:

- ⚠️ **Interações medicamentosas**
- 🚫 **Alergias do paciente**
- ⚡ **Duplicidade de prescrição**

### Imprimir/Enviar Receita

1. Clique em **Imprimir** para gerar PDF
2. Ou clique em **Enviar por WhatsApp** (se configurado)

---

## Exames

### Solicitar Exame

1. Na consulta, acesse a aba **Conduta**
2. Clique em **Solicitar Exame**
3. Busque o tipo de exame
4. Adicione observações (ex: "Jejum de 12h")
5. Clique em **Salvar**

### Visualizar Resultados

1. Na ficha do paciente, acesse **Exames**
2. Clique no exame para ver detalhes
3. Resultados anexados aparecem em PDF ou imagem

### Importar Resultados

1. Clique em **Importar Resultado**
2. Faça upload do arquivo (PDF, JPG, PNG)
3. O sistema extrai dados automaticamente (quando possível)

---

## Prontuário Eletrônico

### Histórico Clínico

O prontuário mostra toda a linha do tempo do paciente:

- Consultas realizadas
- Diagnósticos anteriores
- Medicamentos prescritos
- Exames solicitados e resultados
- Encaminhamentos

### Busca no Prontuário

1. Use a busca dentro do prontuário
2. Filtre por data, tipo ou profissional
3. Exporte em PDF se necessário

### Anexos

- Adicione documentos externos
- Fotografias de lesões
- Resultados de exames de outros serviços

---

## Assistente de IA

O HealthCare possui um assistente de IA para auxiliar no atendimento.

### Transcrição de Voz

1. Clique no ícone do **microfone** 🎤
2. Fale normalmente descrevendo a consulta
3. A IA transcreve em tempo real
4. Revise e faça ajustes necessários

### Sugestão de Diagnóstico

1. Após preencher sintomas, clique em **Sugerir CID**
2. A IA analisa os dados e sugere códigos
3. Selecione o mais adequado

### Verificação de Tratamento

1. Antes de finalizar a prescrição
2. Clique em **Verificar Tratamento**
3. A IA analisa interações e adequação

> ⚠️ **Importante:** A IA é uma ferramenta de apoio. O diagnóstico final é sempre responsabilidade do profissional de saúde.

---

## Relatórios

### Tipos de Relatório

| Relatório | Descrição |
|-----------|-----------|
| Atendimentos | Consultas por período |
| Produtividade | Por profissional |
| Epidemiológico | CIDs mais frequentes |
| Pacientes | Cadastros e perfil demográfico |

### Gerar Relatório

1. Acesse **Relatórios** no menu
2. Selecione o tipo de relatório
3. Defina o período (data inicial e final)
4. Aplique filtros adicionais
5. Clique em **Gerar**

### Exportar

- **PDF:** Para impressão
- **Excel:** Para análise em planilha
- **CSV:** Para integração com outros sistemas

---

## Configurações

### Perfil Pessoal

1. Clique no seu nome no canto superior direito
2. Acesse **Meu Perfil**
3. Atualize foto, assinatura e dados

### Assinatura Digital

1. Em **Configurações** → **Assinatura**
2. Desenhe ou faça upload da assinatura
3. Configure certificado digital (se disponível)

### Notificações

Configure quais alertas deseja receber:

- Novos agendamentos
- Resultados de exames
- Lembretes de retorno

### Preferências do Sistema

- Tema claro/escuro
- Idioma
- Fuso horário
- Sons de notificação

---

## Perguntas Frequentes

### Como resetar minha senha?

1. Na tela de login, clique em **Esqueci a senha**
2. Insira seu email cadastrado
3. Verifique a caixa de entrada
4. Clique no link e defina nova senha

### O sistema está lento. O que fazer?

1. Verifique sua conexão com a internet
2. Limpe o cache do navegador
3. Tente outro navegador
4. Se persistir, contate o suporte

### Como cadastrar um novo profissional?

1. Apenas administradores podem fazer isso
2. Acesse **Configurações** → **Usuários**
3. Clique em **Novo Usuário**
4. Preencha dados e defina permissões

### Posso acessar pelo celular?

Sim! O sistema é responsivo e funciona em:

- Computadores
- Tablets
- Smartphones

Você também pode **instalar como app** para acesso mais rápido.

### Os dados estão seguros?

Sim. O sistema possui:

- ✅ Criptografia de dados
- ✅ Backup automático
- ✅ Controle de acesso por perfil
- ✅ Registro de auditoria
- ✅ Conformidade com LGPD

### Como exportar dados de um paciente?

1. Acesse a ficha do paciente
2. Clique em **Exportar Dados**
3. Escolha o formato (PDF ou JSON)
4. O download iniciará automaticamente

---

## Suporte

Se precisar de ajuda:

- 📧 **Email:** suporte@healthcare.com.br
- 💬 **Chat:** Clique no ícone de chat no canto inferior
- 📞 **Telefone:** (11) 1234-5678

**Horário de atendimento:** Segunda a sexta, 8h às 18h

---

*Versão 1.0 | Novembro 2025*
