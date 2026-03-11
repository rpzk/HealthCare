# Análise de Performance – Página de Consultas

**Objetivo:** Identificar causas de lentidão e sobrecarga do PC na tela de consultas.

---

## 1. Componente monolítico

| Arquivo | Linhas | Hooks (useState/useEffect/etc) | Observação |
|---------|--------|--------------------------------|------------|
| `consultation-workspace.tsx` | **2490** | **~51** | Arquivo muito grande e acoplado |

O `ConsultationWorkspace` concentra praticamente toda a lógica de consulta em um único componente. Cada mudança de estado pode provocar re-render da árvore inteira.

**Impacto:** Re-renders frequentes, bundle grande carregado de uma vez.

---

## 2. Polling duplicado e excessivo

Vários `setInterval` ativos ao mesmo tempo na página de consulta:

| Componente | Intervalo | API chamada |
|------------|-----------|-------------|
| `consultation-workspace` | 10s | `/api/certificate-session` |
| `certificate-session-indicator` (Header) | 30s | `/api/certificate-session` |
| `notification-center` | 30s | notificações |
| Tele/video (se ativo) | 1s | atualização de duração |

**Problema:** A mesma API de certificado é consultada por dois componentes em intervalos diferentes.

**Sugestão:** Centralizar o status do certificado (ex.: contexto ou SWR) e remover o polling do workspace.

---

## 3. Falta de code-splitting

`ConsultationWorkspace` é importado diretamente na página de consulta, sem `dynamic()`:

```tsx
// app/consultations/[id]/page.tsx
import { ConsultationWorkspace } from '@/components/consultations'
```

Componentes pesados carregados juntos:
- MedicationAutocomplete, CIDAutocomplete, ExamAutocomplete
- ProtocolSelector, ProtocolCreator, AISuggestions
- DrugInteractionCheckButton, PatientHistoryPanel
- PrescriptionEditorDialog, ExamEditorDialog, ReferralEditorDialog, CertificateEditorDialog
- TeleRoomCompact, ExamComboPicker
- etc.

**Impacto:** Bundle inicial grande; usuário espera o carregamento de tudo antes de interagir.

**Sugestão:** Usar `dynamic()` para:
- Modais (EditorDialogs)
- TeleRoom
- PatientHistoryPanel
- AISuggestions

---

## 4. Funções sem memoização

Muitas funções definidas dentro do componente são recriadas a cada render:

- `loadConsultation`, `handleSave`, `handleGenerateDocuments`
- `requestPdf`, `openPdf`, `signDocuments`
- `fetchSignatureInfo`, `refreshSignaturesForCurrentDocs`
- Callbacks passados para componentes filhos

**Impacto:** Filhos re-renderizam desnecessariamente; efeitos que dependem dessas funções podem rodar mais vezes que o necessário.

**Sugestão:** Envolver em `useCallback` as funções passadas como props ou usadas em `useEffect`.

---

## 5. Padrões de “gambiarra” nas alterações recentes

### 5.1 Fallbacks que escondem dados inválidos

```tsx
// consultation-workspace - mapeamento de medications
dosage: (rx.dosage || '').trim() || 'Conforme orientação médica',
frequency: (rx.frequency || '').trim() || '1x ao dia',
duration: (rx.duration || '').trim() || '30 dias',
```

**Problema:** Valores vazios viram defaults genéricos em vez de erro de validação. O médico pode achar que preencheu, mas o sistema está corrigindo silenciosamente.

**Sugestão:** Validar no momento de adicionar/editar e bloquear envio se campos obrigatórios estiverem vazios.

### 5.2 Schema muito relaxado

```tsx
// app/api/documents/route.ts - MedicationSchema
concentration: z.string().optional().default('---'),
pharmaceuticalForm: z.string().optional().default('comprimido'),
```

**Problema:** Aceita qualquer payload, inclusive sem concentração nem forma farmacêutica, com preenchimento automático no backend.

**Sugestão:** Manter validação rigorosa na API; garantir que o cliente envie dados completos antes de submeter.

---

## 6. Outras causas de lentidão

1. **Parsing de JSON no cliente** – `loadConsultation` faz parse de `consultationData.notes` com várias estruturas possíveis; lógica complexa e custosa no render.
2. **Sem virtualização** – listas longas (prescrições, exames, encaminhamentos) renderizam todos os itens de uma vez.
3. **Lucide React** – muitos ícones importados; verificar se o tree-shaking está eficiente.
4. **Logger no cliente** – `logger` é importado em vários componentes; checar se há I/O ou processamento pesado em desenvolvimento.

---

## 7. Prioridades de correção

| Prioridade | Ação | Impacto |
|------------|------|---------|
| Alta | Remover polling duplicado de certificate-session no workspace | Menos requisições, menos re-renders |
| Alta | Adicionar `dynamic()` para modais e componentes pesados | Carregamento inicial mais rápido |
| Média | Memoizar callbacks com `useCallback` | Menos re-renders em filhos |
| Média | Revalidar no frontend antes de enviar (sem fallbacks silenciosos) | Menos erros e menos “gambiarras” |
| Baixa | Refatorar workspace em subcomponentes menores | Manutenção e performance |
| Baixa | Considerar virtualização para listas longas | Uso de memória e scroll em listas grandes |

---

## 8. Resumo

A lentidão vem principalmente de:

1. **ConsultationWorkspace muito grande** – muitas responsabilidades, muitos estados e hooks.
2. **Polling duplicado** – várias chamadas periódicas desnecessárias.
3. **Falta de code-splitting** – tudo carregado de uma vez.
4. **Fallbacks silenciosos** – mascaramento de dados incompletos em vez de validação adequada.

Uma primeira etapa efetiva seria: centralizar o status do certificado, remover o polling duplicado e aplicar `dynamic()` nos componentes pesados.
