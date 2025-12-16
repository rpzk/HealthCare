# 📘 Guia Rápido: Novas Funcionalidades SSF

**Versão:** 1.0  
**Atualizado em:** 15/12/2025

---

## 🎯 Visão Geral

Este guia fornece exemplos práticos de uso das novas funcionalidades implementadas na integração completa do SSF.

---

## 💉 1. CALENDÁRIO VACINAL

### 1.1 Registrar uma Vacinação

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Aplicar vacina BCG em recém-nascido
const vaccination = await prisma.vaccination.create({
  data: {
    patientId: "patient-id",
    vaccineId: "vaccine-bcg-id", // Obtido do seed
    applicationDate: new Date(),
    doseNumber: 1,
    lot: "BCG-2024-001",
    expiryDate: new Date("2025-12-31"),
    healthUnitId: "unit-id",
    professionalId: "nurse-id",
    status: "APPLIED",
    adverseReaction: false,
  },
});
```

### 1.2 Obter Vacinas Pendentes para um Paciente

```typescript
// Calcular idade do paciente em meses
const patient = await prisma.patient.findUnique({
  where: { id: "patient-id" },
  include: { vaccinations: true },
});

const ageMonths = calculateAgeInMonths(patient.birthDate);

// Buscar vacinas recomendadas para a idade
const recommendedVaccines = await prisma.vaccineScheduleEntry.findMany({
  where: {
    ageMonths: { lte: ageMonths },
  },
  include: {
    vaccine: true,
  },
});

// Filtrar vacinas já aplicadas
const appliedVaccineIds = patient.vaccinations.map(v => v.vaccineId);
const pendingVaccines = recommendedVaccines.filter(
  rv => !appliedVaccineIds.includes(rv.vaccineId)
);
```

### 1.3 Gerar Relatório de Cobertura Vacinal

```typescript
// Cobertura vacinal por unidade de saúde
const coverage = await prisma.vaccination.groupBy({
  by: ['healthUnitId', 'vaccineId'],
  where: {
    applicationDate: {
      gte: new Date("2024-01-01"),
      lte: new Date("2024-12-31"),
    },
  },
  _count: {
    id: true,
  },
});
```

---

## 🤰 2. PRÉ-NATAL ESTRUTURADO

### 2.1 Criar uma Gestação

```typescript
const pregnancy = await prisma.pregnancy.create({
  data: {
    patientId: "patient-id",
    estimatedDueDate: new Date("2025-09-15"),
    lastMenstrualPeriod: new Date("2024-12-08"),
    gestationalAge: 1, // semanas
    status: "ACTIVE",
    gravidity: 2, // 2ª gestação
    parity: 1,    // 1 parto anterior
    abortions: 0,
    cesareans: 0,
  },
});
```

### 2.2 Registrar Consulta de Pré-Natal

```typescript
// Primeiro criar a consulta normal
const consultation = await prisma.consultation.create({
  data: {
    patientId: "patient-id",
    doctorId: "doctor-id",
    scheduledDate: new Date(),
    type: "PRENATAL",
    status: "COMPLETED",
    prenatal: true, // Flag SSF
  },
});

// Depois adicionar dados específicos do pré-natal
const prenatalConsultation = await prisma.preNatalConsultation.create({
  data: {
    consultationId: consultation.id,
    pregnancyId: pregnancy.id,
    trimester: 1,
    gestationalAge: 8, // semanas
    
    // Medidas obstétricas
    uterineHeight: 12, // cm
    fetalHeartRate: 145, // bpm
    fetalMovements: false, // ainda não
    
    // Testes laboratoriais solicitados
    syphilisTest: true,
    vdrlTest: true,
    urineTest: true,
    glucoseTest: true,
    hemoglobinTest: true,
    hematocritTest: true,
    hivTest: true,
    hepatitisBTest: true,
    toxoplasmosisTest: true,
    
    // Vacinação
    tetanusDose1: true,
    influenzaVaccine: true,
    
    // Classificação de risco
    riskLevel: "LOW_RISK",
    riskFactors: [],
    
    // Orientações
    nutritionalGuidance: true,
    physicalActivity: true,
    breastfeedingPrep: true,
    
    nextConsultDate: new Date("2025-02-15"),
  },
});
```

### 2.3 Registrar Desfecho da Gestação

```typescript
const deliveryDate = new Date("2025-09-10");

await prisma.pregnancy.update({
  where: { id: pregnancy.id },
  data: {
    status: "COMPLETED",
    deliveryDate,
    deliveryType: "VAGINAL",
    deliveryLocation: "HOSPITAL",
    
    // Dados do recém-nascido
    birthWeight: 3200, // gramas
    birthLength: 49.5, // cm
    apgarScore1min: 9,
    apgarScore5min: 10,
    outcome: "LIVE_BIRTH",
    
    postpartumVisit: false, // ainda não realizada
  },
});
```

---

## 📏 3. MEDIDAS ANTROPOMÉTRICAS

### 3.1 Registrar Medidas Completas

```typescript
const vitalSigns = await prisma.vitalSigns.create({
  data: {
    patientId: "patient-id",
    consultationId: "consultation-id",
    
    // Medidas básicas
    weight: 68.5, // kg
    height: 165, // cm
    
    // Antropometria adicional
    waistCircumference: 82, // cm
    hipCircumference: 95, // cm
    
    // Cálculo de IMC (pode ser feito no backend)
    bmi: 25.2,
    bmiClassification: "OVERWEIGHT",
    
    // Outros sinais vitais
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 72,
    temperature: 36.5,
    
    recordedAt: new Date(),
  },
});
```

### 3.2 Registrar Medidas Pediátricas

```typescript
const pediatricVitals = await prisma.vitalSigns.create({
  data: {
    patientId: "child-patient-id",
    consultationId: "consultation-id",
    
    // Medidas pediátricas
    weight: 12.5, // kg (2 anos)
    height: 85, // cm
    headCircumference: 48, // cm
    armCircumference: 16, // cm
    
    // Aleitamento materno
    breastfeeding: "COMPLEMENTARY",
    
    // Classificação OMS (calculado)
    weightForAge: "ADEQUATE",
    heightForAge: "ADEQUATE",
    bmiForAge: "NORMAL",
    nutritionalStatus: "NORMAL",
    
    recordedAt: new Date(),
  },
});
```

---

## 💊 4. PRESCRIÇÕES CLASSIFICADAS

### 4.1 Criar Medicamento Controlado

```typescript
const medication = await prisma.medication.create({
  data: {
    name: "Rivotril",
    synonym: "Clonazepam",
    tradeName: "Rivotril",
    
    // Classificação - Receita Azul (Tipo B)
    prescriptionType: "BLUE_B",
    
    // Informações farmacêuticas
    route: "Oral",
    strength: "2mg",
    unit: "mg",
    form: "Comprimido",
    
    // Restrições
    minAge: 18,
    validityDays: 30, // Receita válida por 30 dias
    
    active: true,
    basicPharmacy: true,
  },
});
```

### 4.2 Prescrever Medicamento Controlado

```typescript
// Criar prescrição
const prescription = await prisma.prescription.create({
  data: {
    patientId: "patient-id",
    doctorId: "doctor-id",
    consultationId: "consultation-id",
    medication: "Rivotril 2mg - Receita Azul (B)",
    dosage: "1 comprimido",
    frequency: "2x ao dia",
    duration: "30 dias",
    instructions: "Tomar 1 comprimido de manhã e 1 à noite",
    status: "ACTIVE",
    digitalSignature: "assinatura-digital-hash",
  },
});

// Adicionar item com medicação catalogada
const prescriptionItem = await prisma.prescriptionItem.create({
  data: {
    prescriptionId: prescription.id,
    medicationId: medication.id,
    dosage: "2mg",
    frequency: "2x/dia",
    duration: "30 dias",
    quantity: 60, // 60 comprimidos (2x30)
    instructions: "Manhã e noite",
  },
});
```

---

## 📄 5. ATESTADOS MÉDICOS EXPANDIDOS

### 5.1 Emitir Atestado de Comparecimento

```typescript
const certificate = await prisma.medicalCertificate.create({
  data: {
    sequenceNumber: 1234,
    year: 2025,
    patientId: "patient-id",
    doctorId: "doctor-id",
    consultationId: "consultation-id",
    
    type: "TIME_OFF",
    startDate: new Date("2025-01-15"),
    
    title: "ATESTADO DE COMPARECIMENTO",
    content: `Atesto para os devidos fins que ${patient.name} compareceu a consulta médica nesta data.`,
    
    issuedAt: new Date(),
  },
});
```

### 5.2 Emitir Passe Livre Municipal

```typescript
const transportPass = await prisma.medicalCertificate.create({
  data: {
    sequenceNumber: 1235,
    year: 2025,
    patientId: "patient-id",
    doctorId: "doctor-id",
    
    type: "MUNICIPAL_TRANSPORT",
    startDate: new Date("2025-01-15"),
    endDate: new Date("2025-07-15"), // 6 meses
    
    title: "PASSE LIVRE MUNICIPAL",
    content: `Atesto que ${patient.name}, portador(a) de deficiência física que o(a) impossibilita de utilizar transporte coletivo convencional, necessita de Passe Livre Municipal pelo período de 6 meses.`,
    
    includeCid: true,
    cidCode: "M54.5",
    cidDescription: "Dor lombar baixa",
    
    issuedAt: new Date(),
  },
});
```

### 5.3 Emitir Licença Maternidade

```typescript
const maternityLeave = await prisma.medicalCertificate.create({
  data: {
    sequenceNumber: 1236,
    year: 2025,
    patientId: "patient-id",
    doctorId: "doctor-id",
    
    type: "MATERNITY_LEAVE",
    days: 120, // 120 dias
    startDate: deliveryDate,
    endDate: addDays(deliveryDate, 120),
    
    title: "LICENÇA MATERNIDADE",
    content: `Atesto que ${patient.name} deu à luz em ${formatDate(deliveryDate)} e necessita de licença maternidade pelo período de 120 dias, conforme legislação vigente.`,
    
    issuedAt: new Date(),
  },
});
```

---

## 🔄 6. ENCAMINHAMENTOS E CONTRA-REFERÊNCIA

### 6.1 Criar Encaminhamento Completo

```typescript
const referral = await prisma.referral.create({
  data: {
    patientId: "patient-id",
    doctorId: "origin-doctor-id",
    consultationId: "origin-consultation-id",
    
    specialty: "Cardiologia",
    description: "Paciente com sopro cardíaco detectado em exame físico. Solicito avaliação cardiológica e ecocardiograma.",
    priority: "URGENT",
    urgencyLevel: "URGENT",
    status: "PENDING",
    
    // Unidade e profissional de destino
    destinationUnitId: "hospital-id",
    destinationDoctorId: "cardiologist-id",
    
    // Data agendada
    scheduledDate: new Date("2025-01-20 14:00"),
    
    notes: "Paciente relata palpitações frequentes",
  },
});
```

### 6.2 Registrar Atendimento do Encaminhamento

```typescript
await prisma.referral.update({
  where: { id: referral.id },
  data: {
    status: "ATTENDED",
    attendedDate: new Date("2025-01-20 14:15"),
    outcome: "ATTENDED",
    outcomeNotes: "Paciente atendido. Realizado ecocardiograma. Diagnóstico: Sopro funcional benigno. Orientado retorno ao médico de origem.",
  },
});
```

### 6.3 Criar Contra-Referência

```typescript
const counterReferral = await prisma.referral.create({
  data: {
    patientId: "patient-id",
    doctorId: "cardiologist-id", // Médico especialista
    
    specialty: "Atenção Primária",
    description: `CONTRA-REFERÊNCIA\n\nPaciente avaliado em consulta cardiológica. Realizado ecocardiograma.\n\nDiagnóstico: Sopro funcional benigno, sem significado patológico.\n\nConduta: Paciente liberado para atividades normais. Não necessita acompanhamento cardiológico. Retornar ao médico de família para seguimento de rotina.`,
    
    priority: "NORMAL",
    status: "COMPLETED",
    
    // Link com referência original
    counterReferralId: referral.id,
    
    destinationUnitId: "origin-unit-id",
    destinationDoctorId: "origin-doctor-id",
    
    outcome: "RESOLVED",
  },
});
```

---

## 👩‍⚕️ 7. HISTÓRIA GINECOLÓGICA

### 7.1 Registrar Menarca

```typescript
const menarche = await prisma.gynecologicalHistory.create({
  data: {
    patientId: "patient-id",
    eventType: "MENARCHE",
    eventDate: new Date("2010-05-15"),
    ageAtEvent: 12,
    description: "Primeira menstruação aos 12 anos",
  },
});
```

### 7.2 Registrar Método Contraceptivo

```typescript
const contraception = await prisma.gynecologicalHistory.create({
  data: {
    patientId: "patient-id",
    consultationId: "consultation-id",
    eventType: "CONTRACEPTION",
    eventDate: new Date("2024-01-15"),
    ageAtEvent: 25,
    contraceptionMethod: "Anticoncepcional Oral Combinado",
    contraceptionStartDate: new Date("2024-01-15"),
    description: "Iniciado uso de anticoncepcional oral (Yaz)",
    clinicalNotes: "Orientada sobre uso correto e efeitos colaterais",
  },
});
```

### 7.3 Registrar Gestação na História

```typescript
const pregnancyHistory = await prisma.gynecologicalHistory.create({
  data: {
    patientId: "patient-id",
    eventType: "PREGNANCY",
    eventDate: new Date("2023-09-10"), // Data do parto
    ageAtEvent: 24,
    description: "1ª gestação - Parto normal - RN 3200g",
    clinicalNotes: "Gestação sem intercorrências. Parto vaginal em trabalho de parto espontâneo.",
  },
});
```

### 7.4 Obter Timeline Completa

```typescript
const gynecologicalTimeline = await prisma.gynecologicalHistory.findMany({
  where: { patientId: "patient-id" },
  orderBy: { eventDate: 'asc' },
  include: {
    consultation: {
      include: {
        doctor: true,
      },
    },
  },
});

// Resultado formatado:
// [
//   { eventType: "MENARCHE", age: 12, date: "2010-05-15" },
//   { eventType: "SEXARCHE", age: 18, date: "2016-03-20" },
//   { eventType: "CONTRACEPTION", age: 20, date: "2018-01-10" },
//   { eventType: "PREGNANCY", age: 24, date: "2023-09-10" },
// ]
```

---

## 📊 8. QUERIES ÚTEIS

### 8.1 Dashboard de Vacinação

```typescript
// Crianças com vacinas atrasadas
const delayedVaccinations = await prisma.patient.findMany({
  where: {
    birthDate: {
      gte: subMonths(new Date(), 24), // Crianças até 2 anos
    },
  },
  include: {
    vaccinations: {
      include: {
        vaccine: true,
      },
    },
  },
});

// Filtrar quem está com vacinas atrasadas
const childrenDelayed = delayedVaccinations.filter(patient => {
  const ageMonths = calculateAgeInMonths(patient.birthDate);
  const expectedVaccines = getExpectedVaccinesForAge(ageMonths);
  const appliedVaccines = patient.vaccinations.length;
  return appliedVaccines < expectedVaccines.length;
});
```

### 8.2 Gestantes de Alto Risco

```typescript
const highRiskPregnancies = await prisma.pregnancy.findMany({
  where: {
    status: "ACTIVE",
    prenatalConsultations: {
      some: {
        riskLevel: "HIGH_RISK",
      },
    },
  },
  include: {
    patient: true,
    prenatalConsultations: {
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
  },
});
```

### 8.3 Medicamentos Controlados Prescritos

```typescript
const controlledMedications = await prisma.prescription.findMany({
  where: {
    createdAt: {
      gte: startOfMonth(new Date()),
      lte: endOfMonth(new Date()),
    },
    items: {
      some: {
        medication: {
          prescriptionType: {
            in: ["CONTROLLED", "BLUE_B", "YELLOW_A"],
          },
        },
      },
    },
  },
  include: {
    patient: true,
    doctor: true,
    items: {
      include: {
        medication: true,
      },
    },
  },
});
```

---

## 🎓 PRÓXIMOS PASSOS

1. **Implementar APIs REST** para todas as novas funcionalidades
2. **Criar interfaces frontend** React/Next.js
3. **Desenvolver relatórios** específicos
4. **Adicionar validações** de regras de negócio
5. **Implementar notificações** (vacinas pendentes, consultas de pré-natal)
6. **Criar dashboards** analíticos

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- [SSF_COMPLETE_IMPLEMENTATION.md](SSF_COMPLETE_IMPLEMENTATION.md) - Implementação completa
- [COMPARACAO_SSF_SISTEMA_ATUAL.md](COMPARACAO_SSF_SISTEMA_ATUAL.md) - Comparação detalhada
- [MATRIZ_COMPARACAO_SSF.md](MATRIZ_COMPARACAO_SSF.md) - Matriz executiva
- [prisma/schema.prisma](prisma/schema.prisma) - Schema do banco de dados

---

**Versão:** 1.0  
**Última Atualização:** 15/12/2025
