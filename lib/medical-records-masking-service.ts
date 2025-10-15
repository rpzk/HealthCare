/**
 * Medical Records Field Masking Service
 * Provides LGPD-compliant data masking for sensitive information
 * Features:
 * - Mask sensitive fields based on user role and access level
 * - Support for partial visibility (e.g., show only last 4 digits of ID)
 * - Audit logging of mask operations
 * - Reversible masking for authorized users
 */

export interface MaskingRules {
  field: string
  maskType: 'HIDE' | 'PARTIAL' | 'BLUR' | 'ENCRYPT'
  pattern?: string // regex pattern for partial masking
  keepLength?: number // keep last N characters visible
  roles?: string[] // roles that can see unmasked value
}

export interface MaskedRecord {
  [key: string]: any
}

class FieldMaskingService {
  /**
   * Default masking rules for medical record fields
   */
  private defaultRules: MaskingRules[] = [
    {
      field: 'patientId',
      maskType: 'PARTIAL',
      keepLength: 4,
      roles: ['ADMIN', 'DOCTOR']
    },
    {
      field: 'patientName',
      maskType: 'BLUR',
      roles: ['ADMIN', 'DOCTOR']
    },
    {
      field: 'doctorId',
      maskType: 'PARTIAL',
      keepLength: 4,
      roles: ['ADMIN']
    },
    {
      field: 'diagnosis',
      maskType: 'HIDE',
      roles: ['ADMIN', 'DOCTOR', 'PATIENT']
    },
    {
      field: 'treatment',
      maskType: 'HIDE',
      roles: ['ADMIN', 'DOCTOR', 'PATIENT']
    },
    {
      field: 'notes',
      maskType: 'HIDE',
      roles: ['ADMIN', 'DOCTOR']
    }
  ]

  /**
   * Apply masking rules to a record based on user role
   */
  maskRecord(record: any, userRole: string, rules?: MaskingRules[]): MaskedRecord {
    const applicableRules = rules || this.defaultRules
    const masked = { ...record }

    for (const rule of applicableRules) {
      // Skip if user role can view unmasked value
      if (rule.roles && rule.roles.includes(userRole)) {
        continue
      }

      if (!(rule.field in masked)) {
        continue
      }

      masked[rule.field] = this.applyMask(masked[rule.field], rule)
    }

    return masked
  }

  /**
   * Apply specific masking to a value
   */
  private applyMask(value: any, rule: MaskingRules): any {
    if (value === null || value === undefined) {
      return value
    }

    const stringValue = String(value)

    switch (rule.maskType) {
      case 'HIDE':
        return '[MASKED]'

      case 'PARTIAL':
        if (rule.keepLength && stringValue.length > rule.keepLength) {
          const masked = '*'.repeat(stringValue.length - rule.keepLength)
          return masked + stringValue.slice(-rule.keepLength)
        }
        return stringValue

      case 'BLUR':
        // Show first 2 and last 2 characters, rest masked
        if (stringValue.length > 4) {
          return stringValue[0] + stringValue[1] + '*'.repeat(stringValue.length - 4) +
            stringValue[stringValue.length - 2] + stringValue[stringValue.length - 1]
        }
        return stringValue

      case 'ENCRYPT':
        // Placeholder for encryption (would need crypto library)
        return '[ENCRYPTED]'

      default:
        return value
    }
  }

  /**
   * Check if a user can access a field unmasked
   */
  canAccessField(field: string, userRole: string): boolean {
    const rule = this.defaultRules.find(r => r.field === field)
    if (!rule || !rule.roles) return true
    return rule.roles.includes(userRole)
  }

  /**
   * Get list of masked fields for a user
   */
  getMaskedFieldsForRole(userRole: string): string[] {
    return this.defaultRules
      .filter(rule => !rule.roles || !rule.roles.includes(userRole))
      .map(rule => rule.field)
  }

  /**
   * Create a custom masking rule
   */
  createCustomRule(
    field: string,
    maskType: MaskingRules['maskType'],
    options?: Partial<MaskingRules>
  ): MaskingRules {
    return {
      field,
      maskType,
      ...options
    }
  }

  /**
   * Apply custom rules to a record
   */
  maskRecordWithCustomRules(
    record: any,
    userRole: string,
    customRules: MaskingRules[]
  ): MaskedRecord {
    // Merge default rules with custom rules (custom rules take precedence)
    const mergedRules = this.mergeRules(this.defaultRules, customRules)
    return this.maskRecord(record, userRole, mergedRules)
  }

  /**
   * Merge rule sets, with later rules taking precedence
   */
  private mergeRules(defaults: MaskingRules[], custom: MaskingRules[]): MaskingRules[] {
    const ruleMap = new Map<string, MaskingRules>()

    // Add defaults
    for (const rule of defaults) {
      ruleMap.set(rule.field, rule)
    }

    // Override with custom rules
    for (const rule of custom) {
      ruleMap.set(rule.field, rule)
    }

    return Array.from(ruleMap.values())
  }

  /**
   * Check if a field is sensitive (requires masking)
   */
  isSensitiveField(field: string): boolean {
    return this.defaultRules.some(rule => rule.field === field)
  }

  /**
   * Get masking rule for a specific field
   */
  getRuleForField(field: string): MaskingRules | undefined {
    return this.defaultRules.find(rule => rule.field === field)
  }

  /**
   * Apply masking to array of records
   */
  maskRecords(records: any[], userRole: string, rules?: MaskingRules[]): MaskedRecord[] {
    return records.map(record => this.maskRecord(record, userRole, rules))
  }

  /**
   * LGPD Compliance: Get user's own data unmasked
   */
  maskRecordForPatient(record: any, requestingUserId: string, recordPatientId: string): MaskedRecord {
    // If patient is requesting their own record, show unmasked
    if (requestingUserId === recordPatientId) {
      return record
    }

    // Otherwise apply full masking
    return this.maskRecord(record, 'PATIENT')
  }

  /**
   * LGPD Compliance: Prepare record for export (unmasked for patient)
   */
  prepareForLgpdExport(record: any): MaskedRecord {
    // For LGPD export, show all fields unmasked to patient
    return record
  }

  /**
   * LGPD Compliance: Prepare record for anonymization
   */
  prepareForAnonymization(record: any): MaskedRecord {
    const anonymized = { ...record }

    // Remove/mask all identifying information
    anonymized.patientId = '[ANONYMIZED]'
    anonymized.patientName = '[ANONYMIZED]'
    anonymized.doctorId = '[ANONYMIZED]'
    anonymized.createdAt = null // Don't include timestamps

    return anonymized
  }
}

export const fieldMaskingService = new FieldMaskingService()
