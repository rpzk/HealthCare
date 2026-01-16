# 🚀 Guia Rápido: Termos de Consentimento Obrigatórios

## ✅ Problema Resolvido

**ANTES**: Usuários podiam usar o sistema sem aceitar termos de consentimento.

**AGORA**: Ao fazer login, se houver termos pendentes, o usuário é **OBRIGADO** a aceitar antes de usar qualquer funcionalidade.

## 🎯 Como Funciona (Simplificado)

1. **Usuário faz login** → Sistema verifica se há termos pendentes
2. **Se há termos pendentes** → Redireciona para página de aceite
3. **Usuário aceita os termos** → Sistema registra e libera acesso
4. **Verificação contínua** → Hook verifica em todas as páginas

## 📝 Como Usar (Admin)

### Criar um Novo Termo

1. Acesse `/admin/terms`
2. Clique em **"Criar novo termo"**
3. Preencha o formulário:
   ```
   Slug: privacy-policy-2025
   Título: Política de Privacidade 2025
   Versão: 1.0.0
   Conteúdo: (seu texto em Markdown)
   Audiência: ALL (ou PATIENT/PROFESSIONAL)
   ```
4. Marque **"Ativo"**
5. Clique em **"Salvar"**

### O Que Acontece Depois?

- ✅ Todos os usuários da audiência selecionada terão que aceitar
- ✅ No próximo login, serão redirecionados para `/terms/accept`
- ✅ Não poderão usar o sistema até aceitar

## 🧪 Testar Localmente

### Opção 1: Criar Termo Manualmente (Desenvolvimento)
```bash
# Rodar em modo desenvolvimento (hot reload automático)
npm run dev

# Ou com Docker (apenas serviços)
docker compose up -d postgres redis
npm run dev

# Acessar e testar:
1. Acesse http://localhost:3000/admin/terms
2. Crie um termo de teste
3. Faça logout e login
4. Deve pedir aceite
```

### Opção 2: Inserir Termos de Exemplo
```bash
# Inserir termos de exemplo no banco
psql -U postgres -d healthcare -f scripts/insert-example-terms.sql

# Fazer logout e login
# Deve pedir aceite de 3-4 termos
```

### Opção 3: Script Automático
```bash
./test-terms-enforcement.sh
```

## 📊 Tipos de Audiência

- **ALL**: Todos os usuários (pacientes + profissionais)
- **PATIENT**: Apenas pacientes
- **PROFESSIONAL**: Apenas profissionais (médicos, enfermeiros, etc.)

## 🎨 Exemplo de Termo

```markdown
# Termo de Uso de IA

Ao aceitar este termo, você autoriza o uso de Inteligência Artificial para:

- Análise de sintomas
- Sugestões de tratamento
- Transcrição de consultas

Seus dados são criptografados e seguros.
```

## 🔍 Verificar Aceites (SQL)

```sql
-- Ver termos ativos
SELECT slug, title, version, audience 
FROM terms 
WHERE "isActive" = true;

-- Ver aceites de um usuário
SELECT 
  u.name,
  t.title,
  ta."acceptedAt",
  ta."ipAddress"
FROM term_acceptances ta
JOIN users u ON u.id = ta."userId"
JOIN terms t ON t.id = ta."termId"
WHERE u.email = 'usuario@exemplo.com';
```

## 🚨 Troubleshooting

### Usuário preso em loop
- Verifique se há termos **ativos** no banco
- Verifique logs do servidor para erros
- Limpe cache do navegador

### Termo não aparece
- Verifique se o termo está **ativo** (`isActive = true`)
- Verifique se a **audiência** está correta
- Verifique se o usuário já aceitou (tabela `term_acceptances`)

### Como desativar temporariamente
```sql
-- Desativar todos os termos (CUIDADO!)
UPDATE terms SET "isActive" = false WHERE slug = 'nome-do-termo';
```

## 📚 Documentação Completa

- **Guia Técnico**: [TERMS_ENFORCEMENT_GUIDE.md](TERMS_ENFORCEMENT_GUIDE.md)
- **Resumo Implementação**: [TERMS_ENFORCEMENT_IMPLEMENTATION.md](TERMS_ENFORCEMENT_IMPLEMENTATION.md)

## 🐳 Deploy em Produção (Docker)

### É necessário rebuild?

**SIM** - As mudanças no código precisam ser incluídas no build final.

```bash
# Rebuild e restart (produção)
docker compose -f docker-compose.prod.yml up -d --build

# Ou rebuild apenas do app (mais rápido)
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# Monitorar logs
docker logs healthcare-app -f
```

> 📖 **Mais detalhes**: [DOCKER_REBUILD_GUIDE.md](DOCKER_REBUILD_GUIDE.md)

## ✅ Checklist de Produção

Antes de deploy em produção:

- [ ] **Testar em desenvolvimento** (`npm run dev`)
- [ ] Criar termos obrigatórios em `/admin/terms`
- [ ] Ativar termos necessários
- [ ] Testar fluxo de aceite
- [ ] Verificar auditoria (IP, User-Agent, timestamp)
- [ ] Documentar quais termos são obrigatórios
- [ ] Treinar equipe sobre gerenciamento de termos
- [ ] **Fazer rebuild do Docker** (`docker compose ... up -d --build`)
- [ ] Verificar logs após deploy

## 🎉 Pronto!

O sistema está funcionando. Qualquer dúvida, consulte a documentação completa em `TERMS_ENFORCEMENT_GUIDE.md`.

---

**Desenvolvido**: 16/01/2026  
**Versão**: 1.0.0  
**Status**: ✅ Produção-Ready
