# Índice de Fixtures – Modelos Reutilizáveis

Fixtures são dados **mestres/referência** que podem ser usados em **qualquer instalação** do sistema. Diferem de dados **específicos da instalação** (usuários, pacientes, consultas, etc.).

---

## Mapeamento: Reutilizável vs Instância-específico

### ✅ Reutilizáveis (fixtures)

| Modelo | Fixture | Script de seed/import |
|--------|---------|------------------------|
| **Term** | `terms.json` | `npm run db:seed:terms` |
| **SystemSetting** | `system-settings.json` | `npm run db:seed:settings` |
| **Branding** | (seed programático) | `npm run db:seed:branding` |
| **CID-10** (Capitulo, Grupo, Categoria, MedicalCode) | `01-master-data/cid10/cid10-complete.json` | `npm run fixtures:import:cid-sql` |
| **CBO** (Group, GrandeGrupo, Subgrupo, Familia, Occupation) | `01-master-data/cbo/cbo-complete.json` | `npm run fixtures:import:all` |
| **SIGTAP** (Grupos, Subgrupos, Procedimentos, Compatibilidades) | `01-master-data/sigtap/sigtap-202602-complete.json` | `npm run fixtures:import:all` |
| **Medication** (RENAME unificada) | `01-master-data/dcb-medicamentos-2025.json` | `npm run fixtures:import:rename` |
| **DocumentTemplate** (padrões) | `document-templates.json` | `npm run db:seed:document-templates` |
| **CIAP2** | `01-master-data/ciap2/ciap2-complete.json` | `npm run db:seed:ciap2` |
| **ExamCatalog** | `01-master-data/exams/exam-catalog.json` | `npm run db:seed:exam-catalog` |
| **FormulaTemplate** | `01-master-data/formulas/formula-templates.json` | `npm run db:seed:formula-templates` |

### ❌ Instância-específicos (não fixtures)

- User, Patient, Person  
- Consultation, Prescription, MedicalRecord  
- Branding (customização por clínica)  
- Tenant, UserTenant  
- AuditLog, Notification, etc.

---

## Enums e tipos fixos (não exigem fixtures)

- **Role**: ADMIN, DOCTOR, NURSE, etc.  
- **PrescriptionType**: SIMPLE, ANTIMICROBIAL, CONTROLLED_A, etc.  
- **ConsultationType**: INITIAL, FOLLOW_UP, EMERGENCY, etc.  
- **ExamCategory**: LABORATORY, RADIOLOGY, ECG, etc.  
- **CodeSystemKind**: CID10, CID11, CIAP2, NURSING  

---

## Dados que podem ser expandidos via fonte externa

| Dado | Fixture atual | Expansão opcional |
|------|---------------|-------------------|
| **CIAP2** | ~150 códigos | CIAP_CID.xls SBMFC → `convert-ciap2.ts` |
| **ExamCatalog** | ~40 exames TUSS | TUSS.zip ANS → importador |
| **FormulaTemplate** | 13 fórmulas genéricas | CSV SSF/Receitas → `import-formulas.ts` |

---

## Fluxo de produção (recomendado)

```bash
# Docker: PRODUCTION_SEED=1 no ambiente (padrão em docker-compose.prod.yml)
# Ou manualmente após deploy:
npm run db:seed:production
```

## Fluxo manual para instalação nova

```bash
# 1. Migrations
npm run db:migrate

# 2. Usuário admin
npm run db:seed

# 3. Fixtures leves (termos + configurações)
npm run db:seed:fixtures

# 4. Dados mestres pesados (CID, CBO, SIGTAP, RENAME)
npm run fixtures:import:cid-sql
npm run fixtures:import:all
npm run fixtures:import:rename

# 5. Fixtures adicionais (documentos, CIAP2, exames, fórmulas)
npm run db:seed:all-fixtures

# 6. (Opcional) Medicamentos via CSV
npm run import:medications -- --file medicamentos.csv
```

---

## Estrutura de arquivos

```
fixtures/
├── 00-INDEX.md              # Este arquivo
├── README.md                # Documentação master-data (CID, CBO, SIGTAP)
├── terms.json               # Termos de uso e consentimentos
├── system-settings.json     # Configurações padrão do sistema
├── document-templates.json   # Templates padrão (prescrição, atestado)
└── 01-master-data/
    ├── cid10/
    │   └── cid10-complete.json
    ├── cbo/
    │   └── cbo-complete.json
    ├── sigtap/
    │   └── sigtap-202602-complete.json
    ├── ciap2/
    │   └── ciap2-complete.json
    ├── exams/
    │   └── exam-catalog.json
    ├── formulas/
    │   └── formula-templates.json
    ├── dcb-medicamentos-2025.json
    ├── rename-2024.json
    └── medications/
        └── README.md
```

---

**Última atualização:** 28/02/2026
