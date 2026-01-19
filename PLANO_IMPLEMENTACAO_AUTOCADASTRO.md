# Plano de Implementação: Completar Autocadastro com Dados Sensíveis

## 📋 Resumo

Adicionar 5 campos críticos ao formulário de aceite de convite para capturar **dados sensíveis completos** durante o autocadastro inicial:

1. **Alergias** (textarea)
2. **CPF** (input com máscara)
3. **Tipo Sanguíneo** (select)
4. **Gênero** (select em vez de default "OTHER")
5. **Contato de Emergência** (input)

Tempo total: **~4 horas**

---

## 🎯 Tarefas

### 1. Adicionar Campos ao PatientInvite (Banco de Dados)

**Status:** ⚠️ Parcial (CPF já existe, mas faltam: alergias, gender, emergencyContact)

**Arquivo:** `prisma/schema.prisma`

**Mudanças:**
```prisma
model PatientInvite {
  // ... campos existentes ...
  
  // NOVOS CAMPOS:
  allergies           String?        // "Penicilina, Amendoim"
  gender              Gender?        // MALE, FEMALE, OTHER
  emergencyContact    String?        // Nome + telefone do contato
  
  // cpf já existe! ✅
}
```

**Comando:**
```bash
npx prisma migrate dev --name add_invite_sensitive_fields
npx prisma generate
```

---

### 2. Adicionar Campos ao POST do Convite

**Arquivo:** `/app/api/patient-invites/route.ts`

**Mudanças (linhas 50-80):**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    email,
    phone,
    patientName,
    birthDate,
    cpf,
    allergies,        // 🆕
    gender,            // 🆕
    emergencyContact,  // 🆕
    customMessage,
    requestedBiometrics,
    assignedDoctorId,
    expiresInDays = 7
  } = body

  // ... validação existente ...
  
  // Criar convite com novos campos
  const invite = await prisma.patientInvite.create({
    data: {
      email,
      phone: phone || null,
      patientName,
      token,
      expiresAt,
      invitedById: session.user.id,
      birthDate: birthDate ? new Date(birthDate) : null,
      cpf: cpf || null,
      allergies: allergies || null,        // 🆕
      gender: gender || null,               // 🆕
      emergencyContact: emergencyContact || null, // 🆕
      customMessage: customMessage || null,
      assignedDoctorId: effectiveAssignedDoctorId || null,
      biometricConsents: {
        // ... resto do código
      }
    }
  })
}
```

---

### 3. Atualizar GET do Convite

**Arquivo:** `/app/api/patient-invites/[token]/route.ts` (GET)

**Mudanças (linhas 150-200):**
```typescript
// GET - Retornar dados do convite incluindo novos campos
const invite = await prisma.patientInvite.findUnique({
  where: { token }
})

return NextResponse.json({
  invite: {
    id: invite.id,
    email: invite.email,
    patientName: invite.patientName,
    birthDate: invite.birthDate,
    cpf: invite.cpf,
    allergies: invite.allergies,        // 🆕
    gender: invite.gender,               // 🆕
    emergencyContact: invite.emergencyContact, // 🆕
    customMessage: invite.customMessage,
    expiresAt: invite.expiresAt
  },
  // ... resto
})
```

---

### 4. Atualizar POST do Aceite

**Arquivo:** `/app/api/patient-invites/[token]/route.ts` (POST)

**Mudanças (linhas 250-350):**

```typescript
export async function POST(request: NextRequest, context: RouteParams) {
  const { token } = await context.params
  const body = await request.json()
  const {
    acceptedConsents,
    acceptedTermIds,
    password,
    phone,
    birthDate,
    // 🆕 Novos campos:
    cpf,
    allergies,
    gender,
    emergencyContact,
    address
  } = body

  // ... validações existentes ...

  // Validar CPF se fornecido
  if (cpf && !isValidCPF(cpf)) {
    return NextResponse.json(
      { error: 'CPF inválido' },
      { status: 400 }
    )
  }

  // Criar paciente com novos campos
  const result = await prisma.$transaction(async (tx) => {
    const patient = await tx.patient.create({
      data: {
        name: invite.patientName,
        email: invite.email,
        phone: phone || invite.phone,
        birthDate: effectiveBirthDate,
        gender: gender || invite.gender || 'OTHER',  // 🆕
        cpf: cpf || invite.cpf,                        // 🆕
        allergies: allergies || invite.allergies,     // 🆕
        emergencyContact: emergencyContact || invite.emergencyContact, // 🆕
        address,
        userId: existingUser?.id
      }
    })
    // ... resto da transação
  })
}
```

---

### 5. Atualizar Formulário de Aceite (UI)

**Arquivo:** `/app/invite/[token]/page.tsx`

**Mudanças:**

#### 5.1 Importar máscara de CPF
```typescript
import { formatCPF, isValidCPF } from '@/lib/cpf-utils' // criar este arquivo
```

#### 5.2 Adicionar estado
```typescript
// Form state (adicionar após linhas existentes)
const [cpf, setCpf] = useState('')
const [allergies, setAllergies] = useState('')
const [gender, setGender] = useState('OTHER')
const [emergencyContact, setEmergencyContact] = useState('')
const [bloodType, setBloodType] = useState('')
```

#### 5.3 Carregar valores do convite
```typescript
const loadInvite = async (inviteToken: string) => {
  // ... código existente ...
  setData(json)
  
  // 🆕 Carregar novos campos do convite
  setCpf(json?.invite?.cpf ? String(json.invite.cpf) : '')
  setAllergies(json?.invite?.allergies ? String(json.invite.allergies) : '')
  setGender(json?.invite?.gender ? String(json.invite.gender) : 'OTHER')
  setEmergencyContact(json?.invite?.emergencyContact ? String(json.invite.emergencyContact) : '')
  setBirthDate(json?.invite?.birthDate ? String(json.invite.birthDate).slice(0, 10) : '')
}
```

#### 5.4 Validação ao submeter
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // 🆕 Validar CPF
  if (cpf && !isValidCPF(cpf)) {
    toast({
      title: 'Erro',
      description: 'CPF inválido',
      variant: 'destructive'
    })
    return
  }

  // 🆕 Validar alergias (não pode estar vazio se informar)
  // (opcional - apenas informativo)

  // ... validações existentes ...

  // Enviar dados atualizados
  const res = await fetch(`/api/patient-invites/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      acceptedConsents,
      acceptedTermIds,
      password,
      phone,
      birthDate: effectiveBirthDate,
      cpf,           // 🆕
      allergies,     // 🆕
      gender,        // 🆕
      emergencyContact // 🆕
    })
  })
  // ... resto
}
```

#### 5.5 Adicionar Card de Dados Sensíveis (após "Dados para Cadastro", antes de "Compartilhamento")

```tsx
{/* 🆕 Card: Dados de Saúde */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Shield className="h-5 w-5 text-red-600" />
      Informações de Saúde & Segurança
    </CardTitle>
    <CardDescription>
      Dados essenciais para seu acompanhamento médico seguro.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Tipo Sanguíneo */}
    <div className="space-y-2">
      <Label htmlFor="bloodType">
        Tipo Sanguíneo <span className="text-red-500">*</span>
      </Label>
      <Select value={bloodType} onValueChange={setBloodType}>
        <SelectTrigger id="bloodType">
          <SelectValue placeholder="Selecione seu tipo sanguíneo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Não informado</SelectItem>
          <SelectItem value="A_POSITIVE">A+</SelectItem>
          <SelectItem value="A_NEGATIVE">A-</SelectItem>
          <SelectItem value="B_POSITIVE">B+</SelectItem>
          <SelectItem value="B_NEGATIVE">B-</SelectItem>
          <SelectItem value="AB_POSITIVE">AB+</SelectItem>
          <SelectItem value="AB_NEGATIVE">AB-</SelectItem>
          <SelectItem value="O_POSITIVE">O+</SelectItem>
          <SelectItem value="O_NEGATIVE">O-</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Gênero */}
    <div className="space-y-2">
      <Label htmlFor="gender">
        Gênero <span className="text-red-500">*</span>
      </Label>
      <Select value={gender} onValueChange={setGender}>
        <SelectTrigger id="gender">
          <SelectValue placeholder="Selecione seu gênero" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MALE">Masculino</SelectItem>
          <SelectItem value="FEMALE">Feminino</SelectItem>
          <SelectItem value="OTHER">Outro</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Alergias */}
    <div className="space-y-2">
      <Label htmlFor="allergies">
        Alergias <span className="text-red-500">*</span>
      </Label>
      <Textarea
        id="allergies"
        placeholder="Ex: Penicilina, Amendoim, Látex (separe com vírgulas)"
        value={allergies}
        onChange={(e) => setAllergies(e.target.value)}
        rows={3}
      />
      <p className="text-xs text-amber-600">
        ⚠️ Importante: informar todas as alergias conhecidas para sua segurança.
      </p>
    </div>

    {/* CPF */}
    <div className="space-y-2">
      <Label htmlFor="cpf">
        CPF <span className="text-red-500">*</span>
      </Label>
      <Input
        id="cpf"
        type="text"
        placeholder="000.000.000-00"
        value={cpf}
        onChange={(e) => setCpf(formatCPF(e.target.value))}
        maxLength={14}
      />
      {cpf && !isValidCPF(cpf) && (
        <p className="text-xs text-red-500">CPF inválido</p>
      )}
    </div>

    {/* Contato de Emergência */}
    <div className="space-y-2">
      <Label htmlFor="emergencyContact">
        Contato de Emergência
      </Label>
      <Input
        id="emergencyContact"
        placeholder="Nome e telefone (Ex: Maria Silva - 11 99999-8888)"
        value={emergencyContact}
        onChange={(e) => setEmergencyContact(e.target.value)}
      />
      <p className="text-xs text-gray-500">
        Pessoa a contactar em caso de emergência médica.
      </p>
    </div>
  </CardContent>
</Card>
```

---

### 6. Criar Utilitários CPF

**Arquivo:** `/lib/cpf-utils.ts` (CRIAR NOVO)

```typescript
/**
 * Formata CPF para padrão 000.000.000-00
 */
export function formatCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

/**
 * Remove formatação do CPF
 */
export function unformatCPF(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Valida CPF (algarismo verificador)
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = unformatCPF(cpf)
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  // Verifica dígito verificador
  let sum = 0
  let remainder
  
  for (let i = 1; i <= 9; i++)
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++)
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}
```

---

## 📋 Ordem de Implementação

### 1️⃣ Database (30 min)
```bash
cd /home/umbrel/HealthCare

# Editar prisma/schema.prisma
# Adicionar campos ao PatientInvite

npx prisma migrate dev --name add_invite_sensitive_fields
npx prisma generate
```

### 2️⃣ Backend API (90 min)
- `/app/api/patient-invites/route.ts` - POST (criar convite)
- `/app/api/patient-invites/[token]/route.ts` - GET (retornar dados)
- `/app/api/patient-invites/[token]/route.ts` - POST (aceitar convite)
- `/lib/cpf-utils.ts` - Criar (validação)

### 3️⃣ Frontend UI (60 min)
- `/app/invite/[token]/page.tsx` - Adicionar campos
- Importar componentes (Select, Textarea, etc.)
- Adicionar validação client-side

### 4️⃣ Testing (30 min)
- Testar fluxo completo
- Validar CPF
- Verificar banco de dados
- Teste de auditoria

**Total: ~4 horas**

---

## ✅ Checklist de Implementação

### Database
- [ ] Editar `prisma/schema.prisma` (PatientInvite)
- [ ] Editar `prisma/schema.prisma` (Patient bloodType já existe)
- [ ] `npx prisma migrate dev`
- [ ] `npx prisma generate`

### Backend - POST Convite
- [ ] Adicionar validação de gender (enum)
- [ ] Adicionar validação de CPF (opcional)
- [ ] Atualizar `patient-invites/route.ts` POST

### Backend - GET Convite
- [ ] Retornar novos campos
- [ ] Atualizar `patient-invites/[token]/route.ts` GET

### Backend - POST Aceite
- [ ] Validar CPF obrigatório
- [ ] Validar gender não-null
- [ ] Parsear allergies
- [ ] Criar paciente com todos os campos
- [ ] Atualizar `patient-invites/[token]/route.ts` POST

### Frontend - Utilitários
- [ ] Criar `/lib/cpf-utils.ts`
- [ ] Adicionar formatCPF()
- [ ] Adicionar isValidCPF()
- [ ] Testar validações

### Frontend - UI
- [ ] Adicionar imports (Textarea, etc.)
- [ ] Adicionar state (cpf, allergies, gender, emergency, bloodType)
- [ ] Adicionar loadInvite updates
- [ ] Adicionar Card de Saúde
- [ ] Adicionar validação em handleSubmit
- [ ] Atualizar JSON POST

### Testing
- [ ] Criar novo convite com dados
- [ ] Aceitar convite com novos campos
- [ ] Validar CPF inválido
- [ ] Verificar auditoria
- [ ] Confirmar banco salva campos
- [ ] Testar edição de perfil pós-registro

---

## 🔧 Commando Rápido (Após Implementar)

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Test
npm run dev
# Ir em: http://localhost:3001/invite/[token-aqui]
```

---

## 📝 Notas

1. **bloodType** já foi adicionado à schema, então não precisamos da migração dele
2. **CPF** já existe no PatientInvite, só precisa ser usado no formulário
3. **Gender** no Patient atualmente é enum, pode ser DEFAULT='OTHER' mas melhor coletar
4. **Alergias** CRÍTICA para segurança - considerar obrigatória futuramente
5. **Endereço** - Pode ficar para Fase 2 (usar campo genérico por enquanto)

---

**Prioridade:** 🔴 CRÍTICA - Implementar esta semana

