# Interface de Consulta Integrada SSF

## Visão Geral

Implementamos uma interface de consulta integrada baseada no sistema legado SSF (Sistema de Saúde da Família), que permite realizar todas as ações da consulta em uma única página sem precisar trocar de tela.

## Características Implementadas

### 1. Layout Visual SSF
- ✅ **Background de saúde**: Imagem `healthcare.webp` do SSF como fundo
- ✅ **Tema turquesa/cyan**: Cores características do SSF (#40e0d0)
- ✅ **Favicon**: Ícone original do SSF
- ✅ **Tipografia**: Roboto (mesma fonte do SSF)
- ✅ **Estilo de seções**: Cards com bordas turquesa e fundo semi-transparente
- ✅ **Botões SSF**: Gradientes turquesa com efeitos hover

### 2. Funcionalidades da Consulta

#### Informações do Paciente
- ✅ Cabeçalho com dados principais do paciente
- ✅ Idade, telefone, endereço
- ✅ Status da consulta e data/hora

#### Sinais Vitais
- ✅ Peso, altura, pressão arterial
- ✅ Frequência cardíaca, temperatura, SpO2
- ✅ Layout responsivo em grade

#### Anamnese SOAP
- ✅ **Subjetivo**: Queixa principal e história
- ✅ **Objetivo**: Exame físico e achados
- ✅ **Avaliação**: Diagnóstico e impressões
- ✅ **Plano**: Condutas e plano terapêutico

#### Prescrições
- ✅ Lista de medicamentos prescritos
- ✅ Adição de novas prescrições inline
- ✅ Dosagem, frequência, duração, instruções
- ✅ Marcação para medicamentos controlados
- ✅ Remoção individual de prescrições

#### Solicitação de Exames
- ✅ Lista de exames solicitados
- ✅ Tipo de exame, descrição, prioridade
- ✅ Observações e data de agendamento
- ✅ Indicadores visuais de prioridade

#### Encaminhamentos
- ✅ Especialidade/serviço de destino
- ✅ Motivo e indicações
- ✅ Prioridade (normal/alta)
- ✅ Unidade ou médico específico

#### Atestados
- ✅ Tipos: Comparecimento, Afastamento, Acompanhante, Saúde
- ✅ Descrição personalizada
- ✅ Número de dias (para afastamento/acompanhante)

### 3. Interface Unificada

#### Vantagens da Interface SSF
1. **Tudo em uma tela**: Não precisa navegar entre páginas
2. **Workflow médico**: Segue o fluxo natural da consulta
3. **Adição inline**: Adiciona receitas, exames, etc. sem pop-ups
4. **Visual profissional**: Tema medical com boa usabilidade
5. **Responsivo**: Funciona em desktop e tablet

#### Como Usar
1. Acesse: `/consultations/[id]` (ex: `/consultations/1`)
2. Preencha sinais vitais se necessário
3. Documente a anamnese usando o método SOAP
4. Adicione prescrições conforme necessário
5. Solicite exames diretamente na interface
6. Faça encaminhamentos se aplicável
7. Emita atestados quando necessário
8. Clique em "Salvar Consulta Completa"

## Estrutura de Arquivos

### Componentes Criados
- `components/consultations/ssf-consultation-workspace-simple.tsx`
- `components/ui/label.tsx`
- `components/ui/select.tsx` 
- `components/ui/separator.tsx`
- `hooks/use-toast.ts`

### APIs
- `app/api/consultations/[id]/complete/route.ts` - Endpoint para salvar consulta completa

### Estilos
- `app/globals.css` - Adicionado tema SSF e classes CSS

### Assets
- `public/healthcare.webp` - Imagem de fundo do SSF
- `public/favicon.ico` - Favicon do SSF

## Como Acessar

1. **Desenvolvimento**: http://localhost:3000/consultations/1
2. **Produção**: Implante normalmente via Docker

## Próximos Passos

### Melhorias Futuras
1. **Integração com banco**: Persistir dados reais
2. **Impressão**: Gerar PDFs de receitas/atestados
3. **Templates**: Modelos pré-definidos de prescrições
4. **Autocomplete**: Busca de medicamentos e exames
5. **Validações**: Regras médicas específicas
6. **Histórico**: Visualizar consultas anteriores

### Personalizações
- As cores e estilos podem ser ajustados no `globals.css`
- Novos tipos de atestados podem ser adicionados
- Campos adicionais podem ser incluídos conforme necessidade

## Compatibilidade

- ✅ Desktop
- ✅ Tablet 
- ⚠️ Mobile (necessita otimização)
- ✅ Todos os navegadores modernos

## Observações Técnicas

- Interface otimizada para workflow médico
- Estados gerenciados localmente até salvar
- Feedback visual para todas as ações
- Tema escuro profissional para reduzir fadiga visual
- Performance otimizada para uso intensivo