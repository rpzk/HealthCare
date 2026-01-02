# 📋 GUIA DE IMPLEMENTAÇÃO - Padrões de UX/UI

## Overview
Este documento descreve como aplicar os novos padrões de UX/UI criados para padronizar a jornada do médico.

---

## 1. Componentes Criados

### ✅ SearchFilter (`components/search/search-filter.tsx`)
Componente unificado para busca e filtros em páginas de listagem.

**Uso em:**
- ✅ Referrals (já implementado)
- ⏳ Prescriptions  
- ⏳ Exams
- ⏳ Consultations
- ⏳ Records

**Exemplo:**
```tsx
<SearchFilter
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  filters={[
    { name: 'status', label: 'Status', options: [...] },
    { name: 'urgency', label: 'Urgência', options: [...] },
  ]}
  filterValues={{ status: filterStatus, urgency: filterUrgency }}
  onFilterChange={handleFilterChange}
  onClear={handleClearFilters}
  loading={loading}
  placeholder="Buscar..."
/>
```

---

### ✅ ActionBar (`components/navigation/action-bar.tsx`)
Componente de ações contextuais para páginas de detalhe.

**Uso em:**
- ✅ Referrals Detail (já implementado)
- ⏳ Prescriptions Detail
- ⏳ Exams Detail
- ⏳ Consultations Detail
- ⏳ Records Detail

**Exemplo:**
```tsx
<ActionBar
  title="Prescrição #123"
  backUrl="/prescriptions"
  canEdit={true}
  onEdit={() => router.push(`/prescriptions/${id}/edit`)}
  canDelete={true}
  onDelete={() => setOpenDeleteDialog(true)}
  canSign={true}
  onSign={handleSign}
  isLoading={isLoading}
/>
```

---

### ✅ ConfirmationDialog (`components/dialogs/confirmation-dialog.tsx`)
Diálogo de confirmação para ações críticas.

**Uso em:**
- ✅ Referrals Detail (já implementado)
- ⏳ Prescriptions Detail
- ⏳ Exams Detail
- ⏳ etc.

**Exemplo:**
```tsx
<ConfirmationDialog
  open={openDelete}
  onOpenChange={setOpenDelete}
  title="Deletar prescrição?"
  description="Esta ação não pode ser desfeita."
  type="danger"
  onConfirm={handleDelete}
/>
```

---

### ✅ Enhanced Toast (`hooks/use-toast.ts`)
Melhorado com sonner para melhor feedback visual.

**Uso:**
```tsx
const { success, error, warning, info } = useToast()

success({
  title: 'Sucesso!',
  description: 'Prescrição criada com sucesso'
})
```

---

## 2. Padrão de Layout para Páginas de Listagem

### Estrutura Padrão
```tsx
<div className="min-h-screen bg-background transition-colors duration-300">
  <Header />
  <div className="flex pt-20">
    <Sidebar />
    <main className="flex-1 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Page Header */}
        <PageHeader
          title="Título"
          description="Descrição"
          breadcrumbs={[...]}
          actions={<Button>Novo +</Button>}
        />

        {/* 2. Search Filter */}
        <SearchFilter {...} />

        {/* 3. Results */}
        {loading ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4">
            {items.map(item => (
              <Card key={item.id} onClick={() => navigate(item.id)}>
                {/* Card content */}
              </Card>
            ))}
          </div>
        )}

        {/* 4. Pagination */}
        {totalPages > 1 && <Pagination />}
      </div>
    </main>
  </div>
</div>
```

---

## 3. Padrão de Layout para Páginas de Detalhe

### Estrutura Padrão
```tsx
<div className="min-h-screen bg-background transition-colors duration-300">
  <Header />
  <div className="flex pt-20">
    <Sidebar />
    <main className="flex-1 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Page Header */}
        <PageHeader title="..." description="..." breadcrumbs={[...]} />

        {/* 2. Action Bar */}
        <ActionBar
          backUrl="/list"
          canEdit={true}
          onEdit={handleEdit}
          canDelete={true}
          onDelete={handleDelete}
        />

        {/* 3. Status Cards (opcional) */}
        <div className="grid grid-cols-3 gap-4">
          <Card>Status</Card>
          <Card>Priority</Card>
          <Card>Date</Card>
        </div>

        {/* 4. Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Main Details (col-span-2) */}
          <div className="col-span-2 space-y-6">
            <Card>Content</Card>
          </div>

          {/* Right: Sidebar Info */}
          <div className="space-y-4">
            <Card>Info</Card>
            <Card>Timeline</Card>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>
```

---

## 4. Checklist de Implementação por Página

### Prescriptions (/app/prescriptions/)

- [ ] **page.tsx** (Listing)
  - [ ] Substituir search/filter customizado por `SearchFilter`
  - [ ] Padronizar layout (max-w-7xl, spacing)
  - [ ] Adicionar empty state melhorado
  - [ ] Testar paginação

- [ ] **[id]/page.tsx** (Detail)
  - [ ] Importar `ActionBar`
  - [ ] Importar `ConfirmationDialog`
  - [ ] Importar `useToast`
  - [ ] Adicionar ActionBar com canEdit, canDelete, canSign
  - [ ] Adicionar ConfirmationDialog para delete
  - [ ] Adicionar toast feedback em ações
  - [ ] Padronizar layout com 3 colunas (content, sidebar)

### Exams (/app/exams/)

- [ ] **page.tsx** (Listing)
  - [ ] Substituir search/filter customizado por `SearchFilter`
  - [ ] Padronizar layout
  - [ ] Adicionar empty state

- [ ] **[id]/page.tsx** (Detail)
  - [ ] Aplicar ActionBar
  - [ ] Adicionar ConfirmationDialog
  - [ ] Integrar useToast
  - [ ] Padronizar layout 3 colunas

### Consultations (/app/consultations/)

- [ ] **page.tsx** (Listing)
  - [ ] Substituir por `SearchFilter`
  - [ ] Padronizar layout

- [ ] **[id]/page.tsx** (Detail)
  - [ ] Adicionar ActionBar
  - [ ] Adicionar ConfirmationDialog
  - [ ] Integrar useToast

### Records (/app/records/)

- [ ] **page.tsx** (Listing)
  - [ ] Substituir por `SearchFilter`
  - [ ] Padronizar layout

- [ ] **[id]/page.tsx** (Detail)
  - [ ] Adicionar ActionBar
  - [ ] Integrar useToast

### Certificates (/app/certificates/)

- [ ] **page.tsx** (Listing)
  - [ ] Substituir por `SearchFilter`
  - [ ] Padronizar layout

- [ ] **[id]/page.tsx** (Detail) - JÁ TEM SIGNATURE WORK
  - [ ] Adicionar ActionBar
  - [ ] Integrar confirmação para delete

---

## 5. Instruções Detalhadas por Tipo de Mudança

### Mudança Tipo A: Substituir Search/Filter Customizado

**Antes:**
```tsx
<div className="flex gap-2 mb-6">
  <Input
    placeholder="Buscar..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
  <Select value={filterStatus} onValueChange={setFilterStatus}>
    <SelectTrigger>...</SelectTrigger>
    <SelectContent>...</SelectContent>
  </Select>
</div>
```

**Depois:**
```tsx
import { SearchFilter, FilterConfig } from '@/components/search/search-filter'

const filterConfigs: FilterConfig[] = [
  {
    name: 'status',
    label: 'Status',
    options: [
      { label: 'Todos', value: 'ALL' },
      { label: 'Ativo', value: 'ACTIVE' },
      // ...
    ]
  }
]

<SearchFilter
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  filters={filterConfigs}
  filterValues={{ status: filterStatus }}
  onFilterChange={(name, value) => setFilterStatus(value)}
  onClear={() => {
    setSearchTerm('')
    setFilterStatus('ALL')
  }}
  loading={loading}
/>
```

---

### Mudança Tipo B: Adicionar ActionBar a Página de Detalhe

**Antes:**
```tsx
<div className="flex justify-between mb-6">
  <Button onClick={() => router.back()}>Voltar</Button>
  <Button onClick={handleDelete} variant="destructive">Deletar</Button>
</div>
```

**Depois:**
```tsx
import { ActionBar } from '@/components/navigation/action-bar'
import { ConfirmationDialog } from '@/components/dialogs/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'

const { success, error } = useToast()
const [openDelete, setOpenDelete] = useState(false)

<ActionBar
  title={item.name}
  backUrl="/list"
  canEdit={true}
  onEdit={() => router.push(`/list/${id}/edit`)}
  canDelete={true}
  onDelete={() => setOpenDelete(true)}
  isLoading={isLoading}
/>

<ConfirmationDialog
  open={openDelete}
  onOpenChange={setOpenDelete}
  title="Deletar?"
  description="Esta ação não pode ser desfeita"
  type="danger"
  onConfirm={handleDelete}
/>
```

---

### Mudança Tipo C: Padronizar Layout

**Antes:**
```tsx
<div className="min-h-screen bg-background">
  <Header />
  <div className="flex pt-16">
    <Sidebar />
    <main className="flex-1 ml-64 p-8">
      {/* content com widths variados */}
    </main>
  </div>
</div>
```

**Depois:**
```tsx
<div className="min-h-screen bg-background transition-colors duration-300">
  <Header />
  <div className="flex pt-20">
    <Sidebar />
    <main className="flex-1 ml-64 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* content sempre com max-width */}
      </div>
    </main>
  </div>
</div>
```

---

## 6. Testing Checklist

Para cada página modificada:

- [ ] Layout visual consistente com sidebar
- [ ] SearchFilter funciona (busca, filtros, limpeza)
- [ ] Pagination funciona corretamente
- [ ] ActionBar exibe botões certos
- [ ] ConfirmationDialog funciona
- [ ] Toasts aparecem em ações
- [ ] Navegação via breadcrumbs
- [ ] Responsividade mobile
- [ ] Acessibilidade (keyboard, screen readers)
- [ ] Performance (loading states, skeleton screens)

---

## 7. Ordem de Implementação Recomendada

**Fase 1 (Done):**
- ✅ Criar componentes base (SearchFilter, ActionBar, ConfirmationDialog)
- ✅ Melhorar Toast
- ✅ Criar Referrals completo como exemplo

**Fase 2 (This Week):**
- ⏳ Prescriptions (most used)
- ⏳ Exams
- ⏳ Consultations

**Fase 3 (Next Week):**
- ⏳ Records
- ⏳ Certificates
- ⏳ Outros

**Fase 4 (Final):**
- ⏳ Testing completo
- ⏳ Ajustes de UX
- ⏳ Performance

---

## 8. Notas Importantes

- **Layout Spacing:** Usar `pt-20` (Header fixo) + `ml-64` (Sidebar) + `p-6` (Content)
- **Max Width:** Sempre usar `max-w-7xl mx-auto` no content principal
- **Grid Columns:** Detail pages = 3 cols (2 left + 1 right sidebar)
- **Spacing:** Use `space-y-6` entre seções, `gap-4` entre cards
- **Colors:** Manter cores consistentes de status/priority
- **Icons:** Usar lucide-react, consistência de tamanhos (h-4 w-4 em labels, h-5 w-5 em headers)
- **Feedback:** Sempre adicionar toasts para ações
- **Loading:** Usar Loader2 com `animate-spin` classe

---

## Próximos Passos

1. ✅ Documentação completa (DONE)
2. ⏳ Implementar Prescriptions detail com ActionBar
3. ⏳ Implementar Exams detail com ActionBar
4. ⏳ Implementar Consultations detail
5. ⏳ Padronizar Records
6. ⏳ Testar jornada completa
7. ⏳ Deploy e validação com usuários
