# 🏥 Medical Records Module - Usage Guide

## Quick Start

### 1. Accessing the Module

Navigate to your application and access the medical records section:

```
https://your-app.com/medical-records/
```

### 2. Main Views

#### 📋 List View (`/medical-records/`)
- **Purpose:** Browse all medical records
- **Features:**
  - Paginated table (10 records per page)
  - Search by title
  - Filter by type (Consulta, Exame, Procedimento, Prescrição, Outro)
  - Filter by priority (Baixa, Normal, Alta, Crítica)
  - Quick action buttons (Editar, Deletar)
  - Color-coded priority badges

#### ➕ Create New (`/medical-records/new/`)
- **Purpose:** Create a new medical record
- **Required Fields:**
  - Title (min 3 characters)
  - Description (min 10 characters)
  - Record Type
  - Patient ID (UUID format)
- **Optional Fields:**
  - Diagnosis (sensitive - LGPD hidden)
  - Treatment (sensitive - LGPD hidden)
  - Priority (default: Normal)
  - Notes (sensitive - LGPD hidden)

#### 👁️ View Detail (`/medical-records/{id}/`)
- **Purpose:** View complete record information
- **Features:**
  - Read-only display
  - Sensitive fields highlighted
  - Metadata (type, priority, creation date)
  - Edit button (DOCTOR and ADMIN only)
  - Delete button (ADMIN only)
  - LGPD compliance information

#### ✏️ Edit Record (`/medical-records/{id}/edit/`)
- **Purpose:** Modify existing record
- **Features:**
  - Pre-filled form with current data
  - Same validation as create
  - Version tracking for conflict detection
  - Audit logging of changes

---

## Features Overview

### 🔍 Search & Filter

**Search by Title:**
- Real-time search as you type
- Searches across full title text
- Case-insensitive matching

**Filter by Type:**
- Consulta (Consultation)
- Exame (Exam)
- Procedimento (Procedure)
- Prescrição (Prescription)
- Outro (Other)

**Filter by Priority:**
- 🟢 Baixa (Low)
- 🔵 Normal
- 🟠 Alta (High)
- 🔴 Crítica (Critical)

**Combine Filters:**
- All filters work together
- "Limpar Filtros" button clears all
- Pagination resets after filtering

### 📄 Pagination

- **Per Page:** 10 records
- **Controls:** Previous/Next buttons and page numbers
- **Display:** "Página X de Y (Total Z)"
- **Quick Navigation:** Click page numbers to jump

### 📝 Form Validation

**Real-Time Validation:**
- Error messages appear under fields
- Errors clear when you start typing
- Submit button disabled if invalid

**Required Field Rules:**
- **Title:** Minimum 3 characters
- **Description:** Minimum 10 characters
- **Patient ID:** Cannot be empty, UUID format
- **Record Type:** Must select one

**Field Types:**
- Text inputs: Title, Patient ID
- Large text areas: Description, Diagnosis, Treatment, Notes
- Dropdowns: Record Type, Priority

### 🔒 Security & Permissions

**What You Can Do (by Role):**

| Action | PATIENT | NURSE | DOCTOR | ADMIN |
|--------|---------|-------|--------|-------|
| View own records | ✅ | - | - | - |
| View all records | - | ✅ | ✅ | ✅ |
| Create records | - | ✅ | ✅ | ✅ |
| Edit own records | - | ✅ | ✅ | ✅ |
| Delete records | - | - | - | ✅ |
| See sensitive data | - | - | ✅ | ✅ |

**Sensitive Fields:**
- Diagnosis (🔒 marked)
- Treatment (🔒 marked)
- Notes (🔒 marked)

These fields are:
- Hidden for patients
- Visible only to doctors and administrators
- Marked with indicators on forms

### ⚡ Rate Limiting

**What is Rate Limiting?**
Rate limiting prevents abuse by restricting how many requests you can make.

**Limits (per day, per user):**
- Create: 100 records
- View: 1000 records
- Update: 200 records
- Delete: 50 records

**If You Hit the Limit:**
- Error message: "Taxa de requisições excedida"
- Message shows when to try again
- The system counts down: "Tente novamente em X minutos"

**Why?**
- Protects the system from overload
- Fair usage policy
- Prevents accidental massive operations

---

## Common Tasks

### Creating a Medical Record

1. Click **"+ Novo Prontuário"** button
2. Fill in required fields:
   - **Título:** "Consulta - Hipertensão" (example)
   - **Descrição:** Detailed description of the visit
   - **Tipo:** Select "Consulta"
3. Fill optional fields:
   - **Diagnóstico:** Patient's diagnosis
   - **Tratamento:** Recommended treatment
   - **Prioridade:** Set to "Normal" or higher if urgent
   - **Observações:** Any additional notes
4. Enter **Patient ID** (UUID format)
5. Click **"Criar Prontuário"**
6. Success! You'll be redirected to the list

### Editing a Record

1. Go to **List View** (`/medical-records/`)
2. Find the record and click **"Editar"** button
3. Update any fields
4. Click **"Atualizar Prontuário"**
5. Changes are logged to audit trail

### Viewing a Record

1. Click record **title** in the list (blue link)
2. Or click **"Editar"** and navigate back
3. View full details including:
   - All metadata
   - Sensitive fields (if authorized)
   - Creation/modification dates
   - Version number

### Deleting a Record

1. In **Detail View** or **List View**
2. Click **"Deletar"** button (ADMIN only)
3. Confirm in modal dialog
4. Record is soft-deleted (preserved in audit trail)

### Searching Records

1. In **List View**, type in search box
2. Results update as you type
3. Search matches any part of the title
4. Combine with type/priority filters

### Filtering by Priority

1. Click **Priority** dropdown
2. Select one or more:
   - Baixa (Low)
   - Normal (default)
   - Alta (High)
   - Crítica (Critical)
3. Table updates immediately
4. Combine with other filters

---

## Data Privacy (LGPD)

### What Does LGPD Mean?

LGPD (Lei Geral de Proteção de Dados) = Brazil's data protection law

### Your Data Rights

✅ **Transparency**
- You can see what data is stored
- Access logs show who viewed your records
- Export data in portable format

✅ **Control**
- Choose who can view sensitive data
- Request deletion of records
- Request anonymization

✅ **Security**
- Data is encrypted in transit
- Sensitive fields are masked
- Changes are tracked and logged

### Sensitive Fields

These fields are considered sensitive and have special protections:

- **Diagnosis** (diagnóstico)
- **Treatment** (tratamento)
- **Notes** (observações)

**How They're Protected:**
- 🔒 Icon indicates sensitive data
- Visible only to doctors and admins
- Patient access shows only general info
- Changes logged with before/after values

### Your Audit Trail

Every action is logged:

```
✅ Who accessed the record
✅ When (date and time)
✅ What action (create, read, update, delete)
✅ What changed (before/after values)
```

Access these logs through admin panel if available.

---

## Troubleshooting

### "Prontuário não encontrado" (Record Not Found)

**Cause:** Record doesn't exist or you don't have access

**Solutions:**
1. Check the URL is correct
2. Go back to list and search for the record
3. Verify the record ID (UUID format)

### "Taxa de requisições excedida" (Rate Limited)

**Cause:** You've exceeded your daily quota

**Solutions:**
1. Wait for the time shown in the message
2. Your quota resets at midnight
3. Contact admin if you need higher limits

### Form Won't Submit

**Causes:**
1. Missing required fields (marked with *)
2. Invalid format (title too short, etc.)
3. Network connection issue

**Check:**
1. Red error messages below fields
2. All required fields filled
3. Try again in a few seconds

### Can't Edit/Delete Record

**Causes:**
1. You don't have permission (not DOCTOR/ADMIN)
2. Record was already deleted by someone else
3. You don't have ADMIN role

**Solutions:**
1. Ask administrator to check your role
2. Refresh the page
3. Go back to list and try another record

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next field |
| `Shift + Tab` | Move to previous field |
| `Enter` | Submit form |
| `Escape` | Cancel/Close modal |

---

## Best Practices

### When Creating Records

✅ **DO:**
- Write clear, descriptive titles
- Include complete information
- Use appropriate priority levels
- Add notes for context

❌ **DON'T:**
- Use generic titles like "Consulta"
- Leave required fields blank
- Add sensitive info in title (only in diagnosis)
- Forget to select patient ID

### When Searching

✅ **DO:**
- Use specific search terms
- Combine filters for precise results
- Clear filters to see all records
- Use pagination instead of scrolling

❌ **DON'T:**
- Use wildcard characters (* or %)
- Filter by too many criteria at once
- Search by patient ID (use as filter instead)

### When Managing Data

✅ **DO:**
- Review changes before submitting
- Use priority levels appropriately
- Keep sensitive data in designated fields
- Verify patient ID before creating

❌ **DON'T:**
- Delete records unnecessarily
- Create duplicate records
- Share audit logs externally
- Modify records without permission

---

## FAQs

**Q: Can I undo a deletion?**
A: Records are soft-deleted (preserved). Contact admin for recovery.

**Q: Who can see my medical records?**
A: Authorized staff only (DOCTOR/ADMIN). Sensitive fields are masked for others.

**Q: How long are records kept?**
A: Records are kept indefinitely unless legally required to delete.

**Q: Can I export my records?**
A: Yes, contact admin for data export in portable format.

**Q: What if I find an error in my record?**
A: Contact your doctor or the record creator to request corrections.

**Q: How do I know who accessed my record?**
A: Check the audit log (admin can provide access).

---

## Support & Feedback

For issues or suggestions:
1. **Technical Issues:** Contact IT support
2. **Privacy Concerns:** Contact compliance officer
3. **Feature Requests:** Submit through admin portal
4. **Security Issues:** Report to security team immediately

---

## System Status

**Uptime:** 99.9% SLA  
**Backup:** Daily automated backups  
**Support Hours:** Monday-Friday, 8am-6pm  
**Emergency:** 24/7 on-call available  

---

**Last Updated:** October 15, 2025  
**Version:** 1.0 (Phase 4 Complete)
