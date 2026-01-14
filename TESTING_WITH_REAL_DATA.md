# 🚀 Guia Rápido: Testando Assinatura Digital com Dados Reais

## Status Atual
✅ **43 medicamentos reais brasileiros importados**
✅ **10 pacientes importados e vinculados**
✅ **Sistema pronto para testes de assinatura digital**

---

## 1️⃣ Acessar o Sistema

```
URL: http://localhost:3000
Usuário (Doctor): rafael.piazenski@gmail.com
```

---

## 2️⃣ Visualizar Pacientes

1. Faça login como **Dr. Rafael**
2. Vá para **Pacientes** (ou `/patients`)
3. Você verá os 10 pacientes importados:
   - João Silva
   - Maria Santos
   - Pedro Oliveira
   - Amanda Costa
   - Roberto Alves
   - (e mais 5...)

---

## 3️⃣ Criar Nova Prescrição

1. Vá para **Prescrições** (ou `/prescriptions`)
2. Clique em **Nova Prescrição**
3. Selecione um dos pacientes importados
4. Na busca de medicamentos, digite nomes como:
   - `Dipirona` (500mg, oral)
   - `Amoxicilina` (500mg)
   - `Losartana` (50mg)
   - `Atorvastatina` (40mg)
   - Ou qualquer um dos 43 medicamentos importados
5. Configure dosagem, frequência, duração
6. Salve a prescrição

---

## 4️⃣ Assinar a Prescrição (Assinatura Digital)

1. Com a prescrição criada, vá para a página da prescrição
2. Clique em **Assinar Digitalmente**
3. Selecione seu certificado PKI-Local
4. Confirme a assinatura
5. Pronto! Assinado com timestamp e verificação

---

## 5️⃣ Medicamentos Disponíveis (Amostra)

### Analgésicos/Antiinflamatórios
- Dipirona (Metamizol) 500mg
- Ibuprofeno 200mg
- Paracetamol 500mg
- Diclofenaco (Potássio) 50mg

### Cardiovasculares
- Losartana 50mg
- Atorvastatina 40mg
- Captopril 25mg
- Enalapril 10mg
- Furosemida 40mg

### Antibióticos
- Amoxicilina 500mg
- Cefalexina 500mg
- Ciprofloxacino 500mg
- Azitromicina 500mg

### Endocrinologia
- Metformina 500mg
- Levotiroxina 50mcg

### Gastrointestinais
- Omeprazol 20mg
- Ranitidina 150mg

### Controlados
- Clonazepam 0.5mg (requer receita azul)

*E 26 outros medicamentos reais da ANVISA...*

---

## 📊 Dados do Banco

```
Medicamentos: 43 registros
Pacientes: 10 registros
Pacientes ativos: 10 (todos vinculados ao Dr. Rafael)
Prescrições prontas: 0 (você criará)
```

---

## ✅ Checklist de Testes Recomendados

- [ ] Login como Dr. Rafael
- [ ] Ver lista de pacientes
- [ ] Criar prescrição com paciente real
- [ ] Buscar medicamento no autocomplete
- [ ] Validar dosagem do medicamento
- [ ] Assinar prescrição digitalmente
- [ ] Verificar assinatura no certificado
- [ ] Gerar certificado digital (se não existir)
- [ ] Revogar assinatura (teste segurança)
- [ ] Validar documento assinado

---

## 🔍 Verificar Status da Importação

```bash
# Contar medicamentos
curl "http://localhost:3000/api/medications/search?q=" | jq '.length'

# Buscar medicamento específico
curl "http://localhost:3000/api/medications/autocomplete?q=Dipirona"

# Conectar direto no banco (admin)
psql -h localhost -U healthcare -d healthcare_db -c "SELECT COUNT(*) FROM Medication;"
psql -h localhost -U healthcare -d healthcare_db -c "SELECT COUNT(*) FROM Patient;"
```

---

## 🆘 Se Algo Não Funcionar

1. **Pacientes não aparecem na lista?**
   - Verifique se está logado como Dr. Rafael
   - Verifique se os pacientes têm um vínculo care-team ativo
   - Comando: `SELECT * FROM PatientCareTeam WHERE "patientId" IN (SELECT id FROM Patient LIMIT 5);`

2. **Medicamentos não aparecem no autocomplete?**
   - Verifique se foram importados: `SELECT COUNT(*) FROM Medication;`
   - Tente buscar com nome completo: "Dipirona"
   - Verifique se "active" = true

3. **Erro ao assinar?**
   - Confirme que tem certificado PKI-Local configurado
   - Vá para Admin → Digital Signatures → gere um novo certificado

---

## 📝 Fontes dos Dados

### Medicamentos
- **Fonte:** Agência Nacional de Vigilância Sanitária (ANVISA)
- **Base:** Medicamentos reais registrados no Brasil
- **Campos:** Nome genérico, sinônimo, fantasia, tipo prescrição, rotas, formatos
- **Total:** 43 fármacos com informações farmacoterapêuticas

### Pacientes
- **Tipo:** Dados simulados mas realísticos
- **Campos:** Nome, email, CPF, data nascimento, risco, alergias, medicações atuais
- **Total:** 10 pacientes exemplo
- **Encriptação:** CPF hasheado (LGPD compliant)

---

## 💡 Dicas

1. **Prescrições com rigor:** O sistema valida dosagem. Se colocar dosagem inválida, será rejeitada.

2. **Pacientes com restrições:** Alguns pacientes têm alergias - atenção ao prescrever!

3. **Medicamentos controlados:** Alguns medicamentos requerem receita especial (azul, amarela, etc)

4. **Frequência inteligente:** Use frequências padrão: 1x/dia, 2x/dia, 3x/dia, 4x/dia, 6x/dia

5. **Teste assinatura:** Crie uma prescrição, assine, depois tente revogar a assinatura (teste de segurança)

---

## 🎓 Próximas Features para Testar

- [ ] AI symptom analysis (se Ollama estiver ativo)
- [ ] Medication tracking
- [ ] NPS questionnaires
- [ ] Telemedicine with digital signatures
- [ ] Exam result signing
- [ ] Medical certificate signing

---

Bom teste! 🎉
