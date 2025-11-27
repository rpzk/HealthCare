/**
 * 🧠 Sistema de IA para Análise e Classificação de Documentos Médicos
 * Processa documentos externos e distribui automaticamente no sistema
 */

import { prisma } from '@/lib/prisma';

export interface MedicalDocument {
  id: string;
  fileName: string;
  content: string;
  uploadDate: Date;
  fileType: 'docx' | 'pdf' | 'txt' | 'rtf';
  status: 'pending' | 'analyzing' | 'classified' | 'imported' | 'error';
  patientId?: string;
}

export interface DocumentAnalysis {
  confidence: number; // 0-1
  documentType: 'EVOLUCAO' | 'EXAME' | 'PRESCRICAO' | 'ANAMNESE' | 'ATESTADO' | 'RECEITA' | 'LAUDO' | 'OUTROS';
  patientInfo: {
    name?: string;
    cpf?: string;
    birthDate?: string;
    medicalRecord?: string;
    confidence: number;
  };
  extractedData: {
    date?: Date;
    doctor?: string;
    specialty?: string;
    diagnosis?: string[];
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
    }>;
    examResults?: Array<{
      examType: string;
      result: string;
      normalValues?: string;
      observation?: string;
    }>;
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: string;
      temperature?: string;
      weight?: string;
      height?: string;
    };
    symptoms?: string[];
    procedures?: string[];
    followUp?: string;
    observations?: string;
  };
  suggestedActions: Array<{
    action: 'CREATE_CONSULTATION' | 'ADD_EXAM_RESULT' | 'CREATE_PRESCRIPTION' | 'UPDATE_PATIENT' | 'CREATE_MEDICAL_RECORD';
    confidence: number;
    data: Record<string, unknown>;
  }>;
}

export class MedicalDocumentAI {
  
  // 📚 Dicionários médicos para classificação
  private medicalTerms = {
    evolucao: [
      'evolução', 'evolucao', 'progress', 'seguimento', 'acompanhamento',
      'estado geral', 'paciente apresenta', 'durante internação',
      'nas últimas 24h', 'evoluindo com', 'mantém-se', 'permanece'
    ],
    exame: [
      'resultado', 'exame', 'laboratorio', 'radiologia', 'hemograma',
      'glicemia', 'ureia', 'creatinina', 'raio-x', 'tomografia',
      'ressonancia', 'ultrassom', 'eletrocardiograma', 'ecg', 'valores de referência'
    ],
    prescricao: [
      'prescricao', 'prescrição', 'medicamento', 'medicação', 'droga',
      'dipirona', 'paracetamol', 'antibiótico', 'mg', 'ml', 'comp',
      'via oral', 'endovenoso', 'intramuscular', 'de 8/8h', 'de 12/12h',
      'tomar', 'administrar', 'aplicar'
    ],
    anamnese: [
      'anamnese', 'história clínica', 'história da doença atual',
      'antecedentes', 'queixa principal', 'hda', 'hpp', 'hpf',
      'paciente refere', 'relata que', 'iniciou quadro'
    ]
  };

  private vitalSignsPatterns = {
    bloodPressure: /(?:pa|pressão arterial|blood pressure)[\s:]*(\d{2,3})\s*[x\/]\s*(\d{2,3})/gi,
    heartRate: /(?:fc|freq[uü]ência cardíaca|heart rate|batimentos)[\s:]*(\d{2,3})/gi,
    temperature: /(?:t°|temperatura|temp)[\s:]*(\d{2,3}[,\.]\d)/gi,
    weight: /(?:peso|weight)[\s:]*(\d{2,3}[,\.]?\d*)\s*kg/gi,
    height: /(?:altura|height)[\s:]*(\d{1,2}[,\.]\d{2})\s*m/gi
  };

  constructor() {}

  /**
   * 🎯 Análise principal do documento usando IA
   */
  async analyzeDocument(document: MedicalDocument): Promise<DocumentAnalysis> {
    const content = document.content.toLowerCase();
    
    // 1. 📋 Classificar tipo de documento
    const documentType = this.classifyDocumentType(content);
    
    // 2. 👤 Extrair informações do paciente
    const patientInfo = this.extractPatientInfo(document.content);
    
    // 3. 📊 Extrair dados médicos estruturados
    const extractedData = this.extractMedicalData(document.content, documentType);
    
    // 4. 🎯 Sugerir ações baseadas na análise
    const suggestedActions = this.suggestActions(documentType, extractedData, patientInfo);
    
    // 5. 📈 Calcular confiança geral
    const confidence = this.calculateOverallConfidence(documentType, patientInfo, extractedData);

    return {
      confidence,
      documentType,
      patientInfo,
      extractedData,
      suggestedActions
    };
  }

  /**
   * 📋 Classifica o tipo de documento médico
   */
  private classifyDocumentType(content: string): DocumentAnalysis['documentType'] {
    const scores: Record<string, number> = {};
    
    // Contar termos por categoria
    for (const [type, terms] of Object.entries(this.medicalTerms)) {
      scores[type] = 0;
      for (const term of terms) {
        const regex = new RegExp(term, 'gi');
        const matches = content.match(regex);
        scores[type] += matches ? matches.length : 0;
      }
    }

    // Classificação baseada em padrões específicos
    if (content.includes('prescrição') || content.includes('receita médica')) {
      return 'PRESCRICAO';
    }
    if (content.includes('resultado') && content.includes('exame')) {
      return 'EXAME';
    }
    if (content.includes('evolução') || content.includes('internação')) {
      return 'EVOLUCAO';
    }
    if (content.includes('anamnese') || content.includes('história clínica')) {
      return 'ANAMNESE';
    }
    if (content.includes('atestado médico')) {
      return 'ATESTADO';
    }
    if (content.includes('laudo médico')) {
      return 'LAUDO';
    }

    // Usar scores para decidir
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      const topType = Object.keys(scores).find(type => scores[type] === maxScore);
      switch (topType) {
        case 'evolucao': return 'EVOLUCAO';
        case 'exame': return 'EXAME';
        case 'prescricao': return 'PRESCRICAO';
        case 'anamnese': return 'ANAMNESE';
        default: return 'OUTROS';
      }
    }

    return 'OUTROS';
  }

  /**
   * 👤 Extrai informações do paciente do documento
   */
  private extractPatientInfo(content: string): DocumentAnalysis['patientInfo'] {
    const patientInfo: DocumentAnalysis['patientInfo'] = { confidence: 0 };

    // Extrair nome (padrões comuns)
    const namePatterns = [
      /(?:paciente|nome)[\s:]*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç\s]+)/i,
      /^([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç\s]+)/m
    ];

    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match && match[1] && match[1].trim().length > 5) {
        patientInfo.name = match[1].trim();
        patientInfo.confidence += 0.3;
        break;
      }
    }

    // Extrair CPF
    const cpfPattern = /(?:cpf|documento)[\s:]*(\d{3}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-]?\d{2})/i;
    const cpfMatch = content.match(cpfPattern);
    if (cpfMatch) {
      patientInfo.cpf = cpfMatch[1].replace(/[\.\-]/g, '');
      patientInfo.confidence += 0.4;
    }

    // Extrair data de nascimento
    const birthDatePattern = /(?:nascimento|nascido|born)[\s:]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i;
    const birthMatch = content.match(birthDatePattern);
    if (birthMatch) {
      patientInfo.birthDate = birthMatch[1];
      patientInfo.confidence += 0.2;
    }

    // Extrair número do prontuário
    const recordPattern = /(?:prontuário|registro|matrícula)[\s:]*(\d+)/i;
    const recordMatch = content.match(recordPattern);
    if (recordMatch) {
      patientInfo.medicalRecord = recordMatch[1];
      patientInfo.confidence += 0.1;
    }

    return patientInfo;
  }

  /**
   * 📊 Extrai dados médicos estruturados
   */
  private extractMedicalData(content: string, documentType: DocumentAnalysis['documentType']): DocumentAnalysis['extractedData'] {
    const data: DocumentAnalysis['extractedData'] = {};

    // Extrair data do documento
    const datePattern = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g;
    const dateMatches = content.match(datePattern);
    if (dateMatches && dateMatches.length > 0) {
      try {
        data.date = new Date(dateMatches[0].replace(/\//g, '-'));
      } catch (e) {
        // Ignorar se não conseguir parsear
      }
    }

    // Extrair médico
    const doctorPattern = /(?:dr|dra|médico|doutor)[\.\s]*([A-ZÁÀÃÂÉÊÍÓÔÕÚÇ][a-záàãâéêíóôõúç\s]+)/i;
    const doctorMatch = content.match(doctorPattern);
    if (doctorMatch) {
      data.doctor = doctorMatch[1].trim();
    }

    // Extrair sinais vitais
    data.vitalSigns = {};
    for (const [sign, pattern] of Object.entries(this.vitalSignsPatterns)) {
      const match = content.match(pattern);
      if (match) {
        data.vitalSigns[sign as keyof typeof data.vitalSigns] = match[0];
      }
    }

    // Extrações específicas por tipo de documento
    switch (documentType) {
      case 'PRESCRICAO':
        data.medications = this.extractMedications(content);
        break;
      case 'EXAME':
        data.examResults = this.extractExamResults(content);
        break;
      case 'EVOLUCAO':
        data.symptoms = this.extractSymptoms(content);
        data.diagnosis = this.extractDiagnosis(content);
        break;
    }

    // Extrair observações gerais
    const obsPattern = /(?:observa[cç][aã]o|obs)[\s:]*([^\n\r]+)/gi;
    const obsMatches = content.match(obsPattern);
    if (obsMatches && obsMatches.length > 0) {
      data.observations = obsMatches.join('. ');
    }

    return data;
  }

  /**
   * 💊 Extrai medicamentos de prescrições
   */
  private extractMedications(content: string): Array<{name: string, dosage: string, frequency: string, duration?: string}> {
    const medications: Array<{name: string, dosage: string, frequency: string, duration?: string}> = [];
    
    // Padrões para medicamentos
    const medicationPatterns = [
      /(\w+[\w\s]*)\s+(\d+\s*(?:mg|ml|comp|caps|g))\s*[-,]?\s*((?:de\s+)?\d+\/\d+h|(?:de\s+)?\d+\s+vezes?\s+ao\s+dia|bid|tid|qid)/gi,
      /(\w+[\w\s]*)\s+[-]\s*(\d+\s*(?:mg|ml|comp|caps|g))/gi
    ];

    for (const pattern of medicationPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        medications.push({
          name: match[1].trim(),
          dosage: match[2] || '',
          frequency: match[3] || '',
          duration: this.extractDuration(content, match.index)
        });
      }
    }

    return medications;
  }

  /**
   * 🧪 Extrai resultados de exames
   */
  private extractExamResults(content: string): Array<{examType: string, result: string, normalValues?: string, observation?: string}> {
    const results: Array<{examType: string, result: string, normalValues?: string, observation?: string}> = [];
    
    // Padrões para exames laboratoriais
    const labPatterns = [
      /(\w+[\w\s]*?)[\s:]+(\d+[,\.]\d+|\d+)\s*(?:mg\/dl|g\/dl|mmol\/l|u\/l)?(?:\s*\(.*?:?\s*([\d,\.-]+[\s\w\/]*)\))?/gi
    ];

    for (const pattern of labPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        results.push({
          examType: match[1].trim(),
          result: match[2],
          normalValues: match[3] || undefined
        });
      }
    }

    return results;
  }

  /**
   * 🤒 Extrai sintomas do documento
   */
  private extractSymptoms(content: string): string[] {
    const symptoms: string[] = [];
    const symptomKeywords = [
      'dor', 'febre', 'náusea', 'vômito', 'diarreia', 'constipação',
      'fadiga', 'cansaço', 'falta de ar', 'tosse', 'cefaleia', 'tontura'
    ];

    for (const symptom of symptomKeywords) {
      const pattern = new RegExp(`\\b${symptom}\\w*\\b`, 'gi');
      if (pattern.test(content)) {
        symptoms.push(symptom);
      }
    }

    return symptoms;
  }

  /**
   * 🩺 Extrai diagnósticos
   */
  private extractDiagnosis(content: string): string[] {
    const diagnosis: string[] = [];
    const diagnosisPatterns = [
      /(?:diagnóstico|hipótese diagnóstica|cid)[\s:]*([^\n\r]+)/gi,
      /(?:conclusão)[\s:]*([^\n\r]+)/gi
    ];

    for (const pattern of diagnosisPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        diagnosis.push(...matches);
      }
    }

    return diagnosis;
  }

  /**
   * ⏱️ Extrai duração de tratamento
   */
  private extractDuration(content: string, position: number): string | undefined {
    const surroundingText = content.slice(Math.max(0, position - 50), position + 100);
    const durationPattern = /(\d+\s+dias?|\d+\s+semanas?|\d+\s+meses?)/i;
    const match = surroundingText.match(durationPattern);
    return match ? match[1] : undefined;
  }

  /**
   * 🎯 Sugere ações baseadas na análise
   */
  private suggestActions(
    documentType: DocumentAnalysis['documentType'],
    extractedData: DocumentAnalysis['extractedData'],
    patientInfo: DocumentAnalysis['patientInfo']
  ): DocumentAnalysis['suggestedActions'] {
    const actions: DocumentAnalysis['suggestedActions'] = [];

    switch (documentType) {
      case 'PRESCRICAO':
        if (extractedData.medications && extractedData.medications.length > 0) {
          actions.push({
            action: 'CREATE_PRESCRIPTION',
            confidence: 0.9,
            data: {
              medications: extractedData.medications,
              doctor: extractedData.doctor,
              date: extractedData.date
            }
          });
        }
        break;

      case 'EXAME':
        if (extractedData.examResults && extractedData.examResults.length > 0) {
          actions.push({
            action: 'ADD_EXAM_RESULT',
            confidence: 0.85,
            data: {
              results: extractedData.examResults,
              date: extractedData.date
            }
          });
        }
        break;

      case 'EVOLUCAO':
        actions.push({
          action: 'CREATE_CONSULTATION',
          confidence: 0.8,
          data: {
            type: 'followUp',
            symptoms: extractedData.symptoms,
            diagnosis: extractedData.diagnosis,
            vitalSigns: extractedData.vitalSigns,
            observations: extractedData.observations,
            date: extractedData.date,
            doctor: extractedData.doctor
          }
        });
        break;

      case 'ANAMNESE':
        actions.push({
          action: 'CREATE_MEDICAL_RECORD',
          confidence: 0.9,
          data: {
            type: 'anamnesis',
            content: extractedData.observations,
            symptoms: extractedData.symptoms,
            date: extractedData.date
          }
        });
        break;
    }

    // Sempre sugerir atualização de paciente se tiver informações
    if (patientInfo.confidence > 0.5) {
      actions.push({
        action: 'UPDATE_PATIENT',
        confidence: patientInfo.confidence,
        data: patientInfo
      });
    }

    return actions;
  }

  /**
   * 📈 Calcula confiança geral da análise
   */
  private calculateOverallConfidence(
    documentType: DocumentAnalysis['documentType'],
    patientInfo: DocumentAnalysis['patientInfo'],
    extractedData: DocumentAnalysis['extractedData']
  ): number {
    let confidence = 0;

    // Confiança base por tipo de documento
    if (documentType !== 'OUTROS') confidence += 0.3;

    // Confiança por informações do paciente
    confidence += patientInfo.confidence * 0.4;

    // Confiança por dados extraídos
    const dataPoints = [
      extractedData.date,
      extractedData.doctor,
      extractedData.medications,
      extractedData.examResults,
      extractedData.symptoms,
      extractedData.vitalSigns,
      extractedData.diagnosis
    ].filter(Boolean).length;

    confidence += Math.min(dataPoints * 0.05, 0.3);

    return Math.min(confidence, 1);
  }

  /**
   * 📝 Gerar relatório de análise para revisão humana
   */
  generateAnalysisReport(analysis: DocumentAnalysis): string {
    const report = [];
    
    report.push(`🧠 RELATÓRIO DE ANÁLISE AI - DOCUMENTO MÉDICO`);
    report.push(`================================================`);
    report.push(`📋 Tipo Identificado: ${analysis.documentType}`);
    report.push(`📊 Confiança Geral: ${(analysis.confidence * 100).toFixed(1)}%`);
    report.push(``);

    if (analysis.patientInfo.confidence > 0) {
      report.push(`👤 INFORMAÇÕES DO PACIENTE:`);
      if (analysis.patientInfo.name) report.push(`   Nome: ${analysis.patientInfo.name}`);
      if (analysis.patientInfo.cpf) report.push(`   CPF: ${analysis.patientInfo.cpf}`);
      if (analysis.patientInfo.birthDate) report.push(`   Nascimento: ${analysis.patientInfo.birthDate}`);
      if (analysis.patientInfo.medicalRecord) report.push(`   Prontuário: ${analysis.patientInfo.medicalRecord}`);
      report.push(`   Confiança: ${(analysis.patientInfo.confidence * 100).toFixed(1)}%`);
      report.push(``);
    }

    if (analysis.extractedData.medications && analysis.extractedData.medications.length > 0) {
      report.push(`💊 MEDICAÇÕES IDENTIFICADAS:`);
      analysis.extractedData.medications.forEach(med => {
        report.push(`   • ${med.name} - ${med.dosage} - ${med.frequency}`);
        if (med.duration) report.push(`     Duração: ${med.duration}`);
      });
      report.push(``);
    }

    if (analysis.extractedData.examResults && analysis.extractedData.examResults.length > 0) {
      report.push(`🧪 RESULTADOS DE EXAMES:`);
      analysis.extractedData.examResults.forEach(exam => {
        report.push(`   • ${exam.examType}: ${exam.result}`);
        if (exam.normalValues) report.push(`     Valores normais: ${exam.normalValues}`);
      });
      report.push(``);
    }

    if (analysis.suggestedActions.length > 0) {
      report.push(`🎯 AÇÕES SUGERIDAS:`);
      analysis.suggestedActions.forEach(action => {
        report.push(`   • ${action.action} (${(action.confidence * 100).toFixed(1)}% confiança)`);
      });
    }

    return report.join('\n');
  }
}

// Instância singleton
export const medicalDocumentAI = new MedicalDocumentAI();
