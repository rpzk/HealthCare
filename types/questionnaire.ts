/**
 * Questionnaire-related types
 */

export type QuestionType = 'TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SCALE' | 'MATRIX' | 'RANKING'
export type ResponseType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT'
export type TherapeuticSystem = 'GENERAL' | 'MENTAL_HEALTH' | 'REHABILITATION' | 'CARDIO' | 'ENDOCRINOLOGY' | 'PULMONOLOGY'

export interface QuestionnaireTemplate {
  id: string
  name: string
  description?: string
  therapeuticSystem: TherapeuticSystem
  estimatedMinutes: number
  categories: QuestionnaireCategory[]
  isBuiltIn: boolean
  isPublic: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface QuestionnaireCategory {
  id: string
  templateId: string
  name: string
  description?: string
  order: number
  questions: Question[]
}

export interface Question {
  id: string
  categoryId: string
  type: QuestionType
  text: string
  required: boolean
  order: number
  options?: QuestionOption[]
  scale?: {
    min: number
    max: number
    minLabel: string
    maxLabel: string
  }
  matrix?: {
    rows: string[]
    columns: string[]
  }
}

export interface QuestionOption {
  id: string
  questionId: string
  text: string
  value: string
  order: number
  score?: number
}

export interface QuestionnaireResponse {
  id: string
  patientId: string
  templateId: string
  answers: Answer[]
  startedAt: Date
  completedAt?: Date
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
}

export interface Answer {
  questionId: string
  value: string | string[] | number | boolean | object
  timestamp: Date
}
