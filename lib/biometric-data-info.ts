/**
 * Informações sobre tipos de dados biométricos
 * Separado para evitar conflito com exports de routes do Next.js
 */

export const BIOMETRIC_DATA_INFO: Record<string, {
  label: string
  description: string
  defaultPurpose: string
  icon: string
}> = {
  HEART_RATE: {
    label: 'Frequência Cardíaca',
    description: 'Batimentos cardíacos por minuto, coletados de smartwatches e monitores cardíacos',
    defaultPurpose: 'Monitoramento cardiovascular e detecção de arritmias',
    icon: '❤️'
  },
  BLOOD_PRESSURE: {
    label: 'Pressão Arterial',
    description: 'Pressão sistólica e diastólica, coletada de monitores de pressão',
    defaultPurpose: 'Acompanhamento de hipertensão e saúde cardiovascular',
    icon: '🩺'
  },
  OXYGEN_SATURATION: {
    label: 'Saturação de Oxigênio',
    description: 'Nível de oxigênio no sangue (SpO2), coletado de oxímetros',
    defaultPurpose: 'Monitoramento respiratório e detecção de hipóxia',
    icon: '💨'
  },
  BLOOD_GLUCOSE: {
    label: 'Glicemia',
    description: 'Nível de glicose no sangue, coletado de glicosímetros e CGMs',
    defaultPurpose: 'Controle de diabetes e metabolismo da glicose',
    icon: '🩸'
  },
  BODY_TEMPERATURE: {
    label: 'Temperatura Corporal',
    description: 'Temperatura do corpo, coletada de termômetros digitais',
    defaultPurpose: 'Detecção de febre e monitoramento de saúde geral',
    icon: '🌡️'
  },
  WEIGHT: {
    label: 'Peso',
    description: 'Peso corporal em quilogramas, coletado de balanças inteligentes',
    defaultPurpose: 'Acompanhamento nutricional e metabólico',
    icon: '⚖️'
  },
  BODY_COMPOSITION: {
    label: 'Composição Corporal',
    description: 'Gordura corporal, massa muscular e água, de balanças de bioimpedância',
    defaultPurpose: 'Avaliação nutricional detalhada e fitness',
    icon: '📊'
  },
  STEPS: {
    label: 'Passos',
    description: 'Contagem de passos diários de smartwatches e pulseiras',
    defaultPurpose: 'Monitoramento de atividade física e sedentarismo',
    icon: '👟'
  },
  SLEEP: {
    label: 'Sono',
    description: 'Dados de qualidade e duração do sono de dispositivos vestíveis',
    defaultPurpose: 'Análise de padrões de sono e qualidade do descanso',
    icon: '😴'
  },
  ECG: {
    label: 'Eletrocardiograma',
    description: 'Traçado de ECG de smartwatches compatíveis',
    defaultPurpose: 'Detecção de fibrilação atrial e outras arritmias',
    icon: '💓'
  },
  RESPIRATORY_RATE: {
    label: 'Frequência Respiratória',
    description: 'Respirações por minuto de dispositivos vestíveis',
    defaultPurpose: 'Monitoramento respiratório e detecção de anomalias',
    icon: '🌬️'
  },
  STRESS_LEVEL: {
    label: 'Nível de Estresse',
    description: 'Indicador de estresse baseado em variabilidade cardíaca',
    defaultPurpose: 'Monitoramento de saúde mental e bem-estar',
    icon: '🧘'
  }
}
