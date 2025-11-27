# 👨‍💻 Guia do Desenvolvedor - HealthCare System

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Setup do Ambiente](#setup-do-ambiente)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Padrões de Código](#padrões-de-código)
6. [APIs](#apis)
7. [Banco de Dados](#banco-de-dados)
8. [Testes](#testes)
9. [Deploy](#deploy)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O HealthCare é um sistema de prontuário eletrônico moderno com IA embarcada, desenvolvido em Next.js 14 com App Router, Prisma ORM e PostgreSQL.

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, React 18, TailwindCSS, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM |
| Banco de Dados | PostgreSQL 15+ |
| Cache | Redis (opcional) |
| IA | Ollama (local), OpenAI (fallback) |
| Autenticação | NextAuth.js v4 |
| Containerização | Docker, Docker Compose |

### Requisitos Mínimos

- Node.js 18.17+
- PostgreSQL 15+
- Docker e Docker Compose (para desenvolvimento)
- 4GB RAM (8GB recomendado para IA local)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser/PWA)                    │
├─────────────────────────────────────────────────────────────────┤
│                         Next.js Frontend                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Hooks     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                         API Layer (App Router)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Middleware  │  │   Routes    │  │ Validation  │              │
│  │(Rate Limit) │  │ /api/*      │  │   (Zod)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                         Services Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Prisma    │  │   Cache     │  │   AI/LLM    │              │
│  │    ORM      │  │  Service    │  │  Service    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
├─────────┼────────────────┼────────────────┼─────────────────────┤
│         │                │                │                      │
│    PostgreSQL         Redis           Ollama/OpenAI              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Request** → Middleware (rate limiting, auth check)
2. **Middleware** → API Route Handler
3. **Handler** → Validação (Zod) → Sanitização
4. **Service** → Prisma/Cache/AI
5. **Response** ← JSON formatado

---

## Setup do Ambiente

### 1. Clonar e Instalar

```bash
git clone https://github.com/rpzk/HealthCare.git
cd HealthCare
npm install
```

### 2. Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.example .env
```

Variáveis essenciais:

```env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/healthcare"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"

# IA (opcional)
OLLAMA_URL="http://localhost:11434"
OPENAI_API_KEY="sk-..."

# Redis (opcional)
REDIS_URL="redis://localhost:6379"
```

### 3. Banco de Dados

```bash
# Subir PostgreSQL e Redis com Docker
docker compose up -d postgres redis

# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações
npx prisma migrate dev

# (Opcional) Popular com dados de teste
npx prisma db seed
```

### 4. Executar

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build
npm start
```

---

## Estrutura do Projeto

```
HealthCare/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── patients/      # CRUD de pacientes
│   │   ├── consultations/ # Consultas
│   │   ├── prescriptions/ # Prescrições
│   │   ├── ai/            # Endpoints de IA
│   │   └── ...
│   ├── (pages)/           # Páginas do app
│   └── layout.tsx         # Layout raiz
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui components
│   ├── patients/         # Componentes de pacientes
│   ├── consultations/    # Componentes de consultas
│   └── ...
├── lib/                   # Utilitários e serviços
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth.ts           # Configuração NextAuth
│   ├── sanitization.ts   # Sanitização de entrada
│   ├── api-validation.ts # Validação de API
│   ├── cache-service.ts  # Serviço de cache
│   └── ...
├── prisma/               # Schema e migrações
│   ├── schema.prisma    # Definição do modelo
│   └── migrations/      # Histórico de migrações
├── tests/               # Testes automatizados
│   └── lib/            # Testes de utilitários
├── public/             # Arquivos estáticos
│   ├── manifest.json   # PWA manifest
│   └── sw.js          # Service Worker
└── docs/              # Documentação
```

---

## Padrões de Código

### TypeScript

- Use `strict: true` no tsconfig
- Defina tipos explícitos para props e retornos
- Use `unknown` em vez de `any` quando possível

```typescript
// ✅ Bom
interface PatientFormProps {
  patient?: Patient
  onSubmit: (data: PatientFormData) => Promise<void>
}

// ❌ Evitar
const handleSubmit = (data: any) => { ... }
```

### API Routes

Use os helpers de validação:

```typescript
import { validateRequestBody, paginationSchema } from '@/lib/api-validation'
import { sanitizeSearchQuery } from '@/lib/sanitization'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Validar paginação
  const pagination = paginationSchema.parse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })
  
  // Sanitizar busca
  const search = sanitizeSearchQuery(searchParams.get('q') || '')
  
  // Query
  const patients = await prisma.patient.findMany({
    where: search ? { name: { contains: search } } : undefined,
    skip: (pagination.page - 1) * pagination.limit,
    take: pagination.limit,
  })
  
  return NextResponse.json({ data: patients })
}
```

### Componentes React

- Use Server Components por padrão
- Adicione `'use client'` apenas quando necessário
- Extraia lógica para hooks customizados

```typescript
// hooks/use-patients.ts
export function usePatients(options?: PatientQueryOptions) {
  return useSWR(
    ['/api/patients', options],
    ([url, opts]) => fetcher(url, opts),
    { revalidateOnFocus: false }
  )
}

// components/patients/patient-list.tsx
'use client'
export function PatientList() {
  const { data, isLoading } = usePatients()
  // ...
}
```

---

## APIs

### Convenções

| Método | Uso |
|--------|-----|
| GET | Listar ou buscar recursos |
| POST | Criar novo recurso |
| PATCH | Atualizar parcialmente |
| DELETE | Remover recurso |

### Autenticação

Todas as rotas (exceto `/api/auth/*` e `/api/health`) requerem autenticação:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // ... lógica autenticada
}
```

### Rate Limiting

O middleware global limita a 300 requests/minuto por IP. Headers de resposta:

- `X-RateLimit-Limit`: Limite total
- `X-RateLimit-Remaining`: Requests restantes
- `X-RateLimit-Reset`: Timestamp de reset

### Principais Endpoints

Consulte a [Documentação da API](./API_REFERENCE.md) para detalhes completos.

---

## Banco de Dados

### Schema Principal

O Prisma schema define 69 modelos. Os principais:

```prisma
model Patient {
  id          String   @id @default(cuid())
  name        String
  cpf         String?  @unique
  birthDate   DateTime?
  gender      String?
  // ... mais campos
  consultations Consultation[]
  prescriptions Prescription[]
}

model Consultation {
  id          String   @id @default(cuid())
  patientId   String
  doctorId    String
  status      String   @default("scheduled")
  // ... mais campos
  patient     Patient  @relation(...)
  doctor      User     @relation(...)
}
```

### Migrações

```bash
# Criar nova migração
npx prisma migrate dev --name nome-da-migracao

# Aplicar em produção
npx prisma migrate deploy

# Reset (⚠️ apaga dados)
npx prisma migrate reset
```

### Queries Otimizadas

Use `select` para limitar campos retornados:

```typescript
// ✅ Otimizado
const patients = await prisma.patient.findMany({
  select: {
    id: true,
    name: true,
    cpf: true,
  },
  take: 10,
})

// ❌ Evitar (carrega todos os campos e relações)
const patients = await prisma.patient.findMany({
  include: { consultations: true, prescriptions: true }
})
```

---

## Testes

### Estrutura

```
tests/
├── setup.ts              # Setup global (mocks)
├── lib/
│   ├── sanitization.test.ts    # Testes de sanitização
│   ├── api-validation.test.ts  # Testes de validação
│   ├── cache-service.test.ts   # Testes de cache
│   └── rbac.test.ts           # Testes de RBAC
```

### Executar

```bash
# Todos os testes
npm run test:unit

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Escrever Testes

```typescript
import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '@/lib/sanitization'

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script>Hello'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<script>')
    expect(result).toContain('Hello')
  })
})
```

---

## Deploy

### Docker (Recomendado)

```bash
# Build e start
docker compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker compose logs -f app
```

### Variáveis de Produção

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://seu-dominio.com
NEXTAUTH_SECRET=...
```

### Checklist de Produção

- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados com backup automático
- [ ] HTTPS habilitado
- [ ] Rate limiting ativo
- [ ] Logs configurados
- [ ] Monitoramento de erros

---

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"

```bash
npx prisma generate
```

### Erro: "Connection refused" ao conectar no banco

1. Verifique se PostgreSQL está rodando
2. Confirme DATABASE_URL no .env
3. Teste conexão: `npx prisma db pull`

### Erro de hidratação React

Verifique se não está usando APIs do browser em Server Components:

```typescript
// ❌ Erro
export default function Page() {
  const width = window.innerWidth // window não existe no servidor
  return <div>{width}</div>
}

// ✅ Correto
'use client'
export default function Page() {
  const [width, setWidth] = useState(0)
  useEffect(() => setWidth(window.innerWidth), [])
  return <div>{width}</div>
}
```

### Testes falhando com "Cannot use import statement"

Verifique se `vitest.config.ts` tem o ambiente correto:

```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  }
})
```

---

## Contato

- **Repositório:** https://github.com/rpzk/HealthCare
- **Issues:** https://github.com/rpzk/HealthCare/issues

---

*Última atualização: Novembro 2025*
