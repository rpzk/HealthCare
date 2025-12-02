# Especificação Técnica: App Mobile Healthcare

## Visão Geral

Aplicativo mobile em **React Native** (ou Flutter) para sincronização de dados de saúde de dispositivos vestíveis e sensores com o sistema Healthcare.

---

## Objetivo Principal

Capturar dados de saúde de múltiplas fontes (Apple HealthKit, Google Health Connect, dispositivos Bluetooth) e sincronizar com o servidor Healthcare de forma **segura** e **automática**.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP MOBILE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   HealthKit  │  │Health Connect│  │  Bluetooth   │          │
│  │    Bridge    │  │    Bridge    │  │   Manager    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Data      │                              │
│                    │  Aggregator │                              │
│                    └──────┬──────┘                              │
│                           │                                      │
│                    ┌──────▼──────┐                              │
│                    │   Sync      │                              │
│                    │   Engine    │                              │
│                    └──────┬──────┘                              │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTPS/JWT
                            ▼
                  ┌─────────────────────┐
                  │  Healthcare API     │
                  │  /api/devices/sync  │
                  └─────────────────────┘
```

---

## Funcionalidades

### 1. Autenticação
- Login com credenciais do Healthcare
- OAuth2/JWT para autenticação segura
- Biometria (Face ID / Fingerprint) para acesso rápido
- Vinculação paciente-app segura

### 2. Integração Apple HealthKit (iOS)
```typescript
// Tipos de dados a capturar
const HEALTHKIT_TYPES = {
  // Cardiovascular
  heartRate: 'HKQuantityTypeIdentifierHeartRate',
  bloodPressureSystolic: 'HKQuantityTypeIdentifierBloodPressureSystolic',
  bloodPressureDiastolic: 'HKQuantityTypeIdentifierBloodPressureDiastolic',
  restingHeartRate: 'HKQuantityTypeIdentifierRestingHeartRate',
  heartRateVariability: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  
  // Respiratório
  oxygenSaturation: 'HKQuantityTypeIdentifierOxygenSaturation',
  respiratoryRate: 'HKQuantityTypeIdentifierRespiratoryRate',
  
  // Metabólico
  bloodGlucose: 'HKQuantityTypeIdentifierBloodGlucose',
  
  // Composição Corporal
  bodyMass: 'HKQuantityTypeIdentifierBodyMass',
  bodyMassIndex: 'HKQuantityTypeIdentifierBodyMassIndex',
  bodyFatPercentage: 'HKQuantityTypeIdentifierBodyFatPercentage',
  
  // Temperatura
  bodyTemperature: 'HKQuantityTypeIdentifierBodyTemperature',
  
  // Atividade
  stepCount: 'HKQuantityTypeIdentifierStepCount',
  distanceWalkingRunning: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  activeEnergyBurned: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  
  // Sono
  sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
}
```

### 3. Integração Google Health Connect (Android)
```kotlin
// Tipos de dados equivalentes
val HEALTH_CONNECT_TYPES = listOf(
    HeartRateRecord::class,
    BloodPressureRecord::class,
    OxygenSaturationRecord::class,
    BloodGlucoseRecord::class,
    WeightRecord::class,
    BodyTemperatureRecord::class,
    StepsRecord::class,
    DistanceRecord::class,
    ActiveCaloriesBurnedRecord::class,
    SleepSessionRecord::class,
)
```

### 4. Conexão Bluetooth Direta
Suporte para dispositivos que usam protocolos padrão:
- **BLE Heart Rate Profile** (0x180D)
- **BLE Blood Pressure Profile** (0x1810)
- **BLE Health Thermometer** (0x1809)
- **BLE Weight Scale** (0x181D)
- **BLE Glucose Profile** (0x1808)

### 5. Sincronização Inteligente
```typescript
interface SyncConfig {
  // Frequência de sync
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number; // 15, 30, 60
  
  // Condições
  syncOnlyOnWifi: boolean;
  syncOnlyWhenCharging: boolean;
  
  // Filtros
  syncStartDate: Date; // Não sincronizar dados antigos
  typesToSync: string[]; // Tipos de dados selecionados
  
  // Background
  backgroundSyncEnabled: boolean;
}
```

---

## Telas do App

### 1. Login / Onboarding
- Tela de login com email/senha
- QR Code scan para vincular ao sistema (opcional)
- Tutorial de permissões

### 2. Dashboard
```
┌─────────────────────────────────────┐
│  👤 Olá, Maria!                     │
│  Última sync: há 5 min              │
├─────────────────────────────────────┤
│                                     │
│  ❤️ FC: 72 bpm     🩸 PA: 120/80   │
│  💧 SpO2: 98%      🌡️ 36.5°C       │
│                                     │
│  📊 Hoje                            │
│  ├─ 8,432 passos                    │
│  ├─ 5.2 km percorridos              │
│  └─ 320 kcal queimadas              │
│                                     │
│  [    Sincronizar Agora    ]        │
│                                     │
└─────────────────────────────────────┘
```

### 3. Histórico
- Gráficos interativos por tipo de dado
- Filtros por período
- Exportação para PDF

### 4. Dispositivos
- Lista de fontes conectadas
- Status de cada fonte
- Gerenciar permissões

### 5. Configurações
- Preferências de sync
- Notificações
- Privacidade

---

## API Endpoints Utilizados

### Autenticação
```
POST /api/mobile/auth/login
POST /api/mobile/auth/refresh
POST /api/mobile/auth/link-patient
```

### Sincronização
```
POST /api/devices/sync
{
  "patientId": "xxx",
  "dataSource": "APPLE_HEALTHKIT",
  "readings": [
    {
      "type": "HKQuantityTypeIdentifierHeartRate",
      "value": 72,
      "startDate": "2025-11-30T10:30:00Z",
      "endDate": "2025-11-30T10:30:00Z",
      "sourceType": "watch",
      "sourceName": "Apple Watch"
    }
  ]
}
```

### Consultas
```
GET /api/devices/dashboard?patientId=xxx&period=30
GET /api/devices/readings?patientId=xxx&readingType=HEART_RATE
GET /api/devices?patientId=xxx
```

---

## Segurança

### Requisitos
1. **HTTPS obrigatório** para todas as comunicações
2. **JWT com expiração curta** (15 min) + refresh token
3. **Biometria** para operações sensíveis
4. **Criptografia local** (Keychain/Keystore) para tokens
5. **Certificate pinning** para prevenir MITM
6. **Dados sensíveis não armazenados** localmente

### Fluxo de Autenticação
```
1. Usuário faz login no app
2. App recebe JWT + refresh token
3. JWT armazenado em Keychain/Keystore (criptografado)
4. Cada request inclui JWT no header
5. Se JWT expirou, usa refresh token para renovar
6. Se refresh token expirou, força novo login
```

---

## Bibliotecas Recomendadas

### React Native
```json
{
  "dependencies": {
    "react-native-health": "^1.x", // HealthKit
    "react-native-health-connect": "^1.x", // Health Connect
    "react-native-ble-plx": "^2.x", // Bluetooth
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-keychain": "^8.x", // Segurança
    "react-native-background-fetch": "^4.x", // Background sync
    "@tanstack/react-query": "^5.x", // Data fetching
    "zustand": "^4.x" // State management
  }
}
```

### Flutter (alternativa)
```yaml
dependencies:
  health: ^10.0.0 # HealthKit + Health Connect
  flutter_blue_plus: ^1.x # Bluetooth
  flutter_secure_storage: ^9.x # Segurança
  workmanager: ^0.5.x # Background tasks
  dio: ^5.x # HTTP client
  riverpod: ^2.x # State management
```

---

## Timeline Estimado

| Fase | Descrição | Duração |
|------|-----------|---------|
| 1 | Setup + Autenticação | 2 semanas |
| 2 | Integração HealthKit | 2 semanas |
| 3 | Integração Health Connect | 2 semanas |
| 4 | Bluetooth Direto | 3 semanas |
| 5 | UI/UX completa | 2 semanas |
| 6 | Testes + Ajustes | 2 semanas |
| **Total** | | **~13 semanas** |

---

## Considerações Importantes

### Apple HealthKit
- Requer **entitlements** específicos no Xcode
- Revisão rigorosa da App Store
- Deve explicar uso de dados na App Store Connect

### Google Health Connect
- Disponível apenas Android 14+ nativamente
- Androids mais antigos precisam instalar o app Health Connect
- Requer declaração de permissões no manifest

### Privacidade (LGPD/HIPAA)
- Consentimento explícito antes de coletar dados
- Opção de deletar todos os dados
- Transparência sobre quais dados são coletados
- Dados transmitidos apenas para servidor do paciente

---

## Próximos Passos

1. **Validar** esta especificação com stakeholders
2. **Escolher** stack (React Native vs Flutter)
3. **Prototipar** UI no Figma
4. **Desenvolver** MVP com HealthKit/Health Connect
5. **Testar** com grupo piloto
6. **Publicar** nas lojas

---

**Documento Preparado:** 30 de Novembro de 2025  
**Versão:** 1.0
