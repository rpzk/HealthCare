/**
 * e-SUS AB - Sistema de Informação em Saúde para Atenção Básica
 * 
 * Integração com o sistema de envio de produção do SUS para Atenção Primária
 * 
 * Documentação oficial: https://sisab.saude.gov.br/
 * 
 * Fichas CDS (Coleta de Dados Simplificada) suportadas:
 * - Ficha de Atendimento Individual
 * - Ficha de Atendimento Odontológico
 * - Ficha de Procedimentos
 * - Ficha de Visita Domiciliar
 * - Ficha de Atividade Coletiva
 * - Ficha de Vacinação
 * - Ficha de Cadastro Individual
 * - Ficha de Cadastro Domiciliar
 * 
 * Formatos de exportação:
 * - XML (padrão e-SUS AB 3.x)
 * - Thrift (binário, mais eficiente)
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'
import { format } from 'date-fns'

// ============ CONFIGURAÇÃO ============

const ESUS_CONFIG = {
  version: '3.2.25',
  uuidDadosSerializados: 3, // Versão do formato
  tipoDadoSerializado: 2, // CDS
  cnesDefault: process.env.ESUS_CNES || '',
  ineDefault: process.env.ESUS_INE || ''
}

// ============ TIPOS ============

// Cabeçalho comum das fichas
interface HeaderTransport {
  uuidFicha: string
  profissionalCNS?: string
  cboCodigo_2002?: string
  cnes: string
  ine?: string
  dataAtendimento: number // timestamp ms
  codigoIbgeMunicipio: string
}

// Ficha de Atendimento Individual
interface FichaAtendimentoIndividual {
  headerTransport: HeaderTransport
  numProntuario?: string
  cnsResponsavelFamiliar?: string
  cnsCidadao?: string
  dtNascimento?: number
  sexo?: number // 1=Masculino, 2=Feminino
  localAtendimento?: number
  turno?: number
  tipoAtendimento?: number
  pesoAcompanhamentoNutricional?: number
  alturaAcompanhamentoNutricional?: number
  perimetroCefalico?: number
  vacinaEmDia?: boolean
  // Problemas/condições avaliadas
  problemaCondicaoAvaliada?: ProblemaCondicao
  // Condutas
  condutaDesfecho?: CondutaDesfecho
  // CIAP/CID
  ciap?: string[]
  cid?: string[]
  // Medicamentos
  medicamentosPrescricao?: MedicamentoPrescricao[]
  // Racionalidade
  racionalidadeSaude?: number
  // Exames
  examesSolicitados?: string[]
  examesAvaliados?: string[]
}

// Problema/Condição avaliada
interface ProblemaCondicao {
  asmaFichaEspecifica?: boolean
  desnutricao?: boolean
  diabetes?: boolean
  dpoc?: boolean
  hipertensaoArterial?: boolean
  obesidade?: boolean
  prenatal?: boolean
  puericultura?: boolean
  puerpera?: boolean
  reabilitacao?: boolean
  saudeMental?: boolean
  saudeSexualReprodutiva?: boolean
  tabagismo?: boolean
  tuberculose?: boolean
  hanseniase?: boolean
  usuario?: number // Álcool/Drogas
  outrosCIAPSelecionados?: string[]
}

// Conduta/Desfecho
interface CondutaDesfecho {
  encaminhamentoInternoNoDia?: boolean
  encaminhamentoEspecializado?: boolean
  encaminhamentoHospitalar?: boolean
  encaminhamentoUrgencia?: boolean
  agendamentoGrupo?: boolean
  agendamentoNasf?: boolean
  altaEpisodio?: boolean
}

// Medicamento prescrição
interface MedicamentoPrescricao {
  codigoCatmat?: string
  viaAdministracao?: number
  dose?: string
  doseUnica?: boolean
  usoContinuo?: boolean
  duraTratamento?: number
  qtdReceitada?: number
}

// Ficha de Procedimentos
interface FichaProcedimentos {
  headerTransport: HeaderTransport
  numProntuario?: string
  cnsCidadao?: string
  dtNascimento?: number
  sexo?: number
  localAtendimento?: number
  turno?: number
  procedimentos: ProcedimentoRealizado[]
}

interface ProcedimentoRealizado {
  codigoSigtap: string
  quantidade: number
}

// Ficha de Visita Domiciliar
interface FichaVisitaDomiciliar {
  headerTransport: HeaderTransport
  numProntuario?: string
  cnsCidadao?: string
  dtNascimento?: number
  sexo?: number
  turno?: number
  tipoDeImoveisVisita?: number
  motivosVisita?: number[]
  desfecho?: number
}

// Resultado da exportação
interface ExportResult {
  success: boolean
  xml?: string
  fichasCount: number
  errors: string[]
  batchId?: string
}

// ============ SERVIÇO PRINCIPAL ============

class ESUSServiceClass {
  /**
   * Gera XML da Ficha de Atendimento Individual a partir de uma consulta
   */
  async generateFichaAtendimentoFromConsultation(
    consultationId: string
  ): Promise<{ success: boolean; ficha?: FichaAtendimentoIndividual; error?: string }> {
    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              cpf: true,
              birthDate: true,
              gender: true,
              phone: true
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
              crmNumber: true,
              licenseNumber: true,
              speciality: true
            }
          },
          diagnoses: {
            include: {
              primaryCode: {
                include: { system: true }
              }
            }
          },
          prescriptions: {
            include: {
              items: {
                include: {
                  medication: true
                }
              }
            }
          },
          vitalSigns: true
        }
      })

      if (!consultation) {
        return { success: false, error: 'Consulta não encontrada' }
      }

      // Buscar último registro de sinais vitais
      const vitals = consultation.vitalSigns[0]

      // Separar diagnósticos por sistema (CID vs CIAP)
      const cidCodes: string[] = []
      const ciapCodes: string[] = []
      
      for (const diag of consultation.diagnoses) {
        if (diag.primaryCode.system.kind === 'CID10') {
          cidCodes.push(diag.primaryCode.code)
        } else if (diag.primaryCode.system.kind === 'CIAP2') {
          ciapCodes.push(diag.primaryCode.code)
        }
      }

      // Mapear problemas/condições
      const problemaCondicao: ProblemaCondicao = {
        diabetes: consultation.diabetes,
        hipertensaoArterial: consultation.hypertension,
        prenatal: consultation.prenatal,
        puericultura: consultation.childCare,
        puerpera: consultation.postpartum,
        saudeMental: consultation.mentalHealth,
        tuberculose: consultation.tuberculosis,
        hanseniase: consultation.leprosy,
        usuario: consultation.alcoholUser ? 1 : consultation.drugUser ? 2 : undefined
      }

      // Mapear condutas
      const condutaDesfecho: CondutaDesfecho = {
        encaminhamentoEspecializado: consultation.referralMade,
        // Adicionar outras condutas conforme mapeamento
      }

      // Mapear medicamentos
      const medicamentos: MedicamentoPrescricao[] = []
      for (const prescription of consultation.prescriptions) {
        for (const item of prescription.items) {
          // Usar código SUS se disponível (susCode)
          const isContinuous = item.medication?.prescriptionType === 'CONTINUOUS'
          medicamentos.push({
            codigoCatmat: item.medication?.susCode || undefined,
            dose: item.dosage,
            usoContinuo: isContinuous,
            qtdReceitada: item.quantity || undefined
          })
        }
      }

      const ficha: FichaAtendimentoIndividual = {
        headerTransport: {
          uuidFicha: this.generateUUID(),
          cnes: ESUS_CONFIG.cnesDefault,
          ine: ESUS_CONFIG.ineDefault,
          dataAtendimento: consultation.scheduledDate.getTime(),
          codigoIbgeMunicipio: process.env.ESUS_IBGE_CODE || '000000'
        },
        numProntuario: consultation.patient.id.substring(0, 30),
        dtNascimento: consultation.patient.birthDate.getTime(),
        sexo: consultation.patient.gender === 'MALE' ? 1 : 2,
        localAtendimento: 1, // 1 = UBS
        tipoAtendimento: this.mapTipoAtendimento(consultation),
        pesoAcompanhamentoNutricional: vitals?.weight || undefined,
        alturaAcompanhamentoNutricional: vitals?.height ? vitals.height * 100 : undefined, // cm
        problemaCondicaoAvaliada: problemaCondicao,
        condutaDesfecho: condutaDesfecho,
        ciap: ciapCodes.length > 0 ? ciapCodes : undefined,
        cid: cidCodes.length > 0 ? cidCodes : undefined,
        medicamentosPrescricao: medicamentos.length > 0 ? medicamentos : undefined,
        examesSolicitados: consultation.laboratory ? ['0202'] : undefined // Código genérico
      }

      return { success: true, ficha }
    } catch (error) {
      logger.error('[e-SUS] Erro ao gerar ficha:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Gera Ficha de Procedimentos a partir de uma consulta
   */
  async generateFichaProcedimentos(
    consultationId: string
  ): Promise<{ success: boolean; ficha?: FichaProcedimentos; error?: string }> {
    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          patient: {
            select: {
              id: true,
              birthDate: true,
              gender: true
            }
          },
          doctor: true
        }
      })

      if (!consultation) {
        return { success: false, error: 'Consulta não encontrada' }
      }

      // Mapear procedimentos realizados baseado nos flags da consulta
      const procedimentos: ProcedimentoRealizado[] = []

      // Consulta médica = 0301010064
      procedimentos.push({ codigoSigtap: '0301010064', quantidade: 1 })

      // Adicionar procedimentos baseado nos flags
      if (consultation.laboratory) {
        procedimentos.push({ codigoSigtap: '0202', quantidade: 1 })
      }
      if (consultation.ecg) {
        procedimentos.push({ codigoSigtap: '0211060100', quantidade: 1 })
      }
      if (consultation.ultrasound) {
        procedimentos.push({ codigoSigtap: '0205', quantidade: 1 })
      }
      if (consultation.preventive) {
        procedimentos.push({ codigoSigtap: '0203010086', quantidade: 1 })
      }

      const ficha: FichaProcedimentos = {
        headerTransport: {
          uuidFicha: this.generateUUID(),
          cnes: ESUS_CONFIG.cnesDefault,
          ine: ESUS_CONFIG.ineDefault,
          dataAtendimento: consultation.scheduledDate.getTime(),
          codigoIbgeMunicipio: process.env.ESUS_IBGE_CODE || '000000'
        },
        numProntuario: consultation.patient.id.substring(0, 30),
        dtNascimento: consultation.patient.birthDate.getTime(),
        sexo: consultation.patient.gender === 'MALE' ? 1 : 2,
        localAtendimento: 1,
        procedimentos
      }

      return { success: true, ficha }
    } catch (error) {
      logger.error('[e-SUS] Erro ao gerar ficha procedimentos:', error)
      return { success: false, error: String(error) }
    }
  }

  /**
   * Exporta lote de fichas para XML no formato e-SUS AB
   */
  async exportBatchToXML(
    startDate: Date,
    endDate: Date
  ): Promise<ExportResult> {
    const errors: string[] = []
    const fichas: FichaAtendimentoIndividual[] = []

    try {
      // Buscar consultas do período
      const consultations = await prisma.consultation.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          },
          status: 'COMPLETED'
        },
        select: { id: true }
      })

      logger.info(`[e-SUS] Exportando ${consultations.length} consultas`)

      // Gerar fichas
      for (const consultation of consultations) {
        const result = await this.generateFichaAtendimentoFromConsultation(consultation.id)
        if (result.success && result.ficha) {
          fichas.push(result.ficha)
        } else if (result.error) {
          errors.push(`Consulta ${consultation.id}: ${result.error}`)
        }
      }

      // Gerar XML
      const xml = this.generateXML(fichas)

      // Registrar exportação
      const batch = await prisma.eSUSSubmission.create({
        data: {
          fichaType: 'CDS_ATENDIMENTO_BATCH',
          localResourceId: `batch_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}`,
          status: 'GENERATED',
          batchId: this.generateUUID()
        }
      })

      return {
        success: true,
        xml,
        fichasCount: fichas.length,
        errors,
        batchId: batch.batchId || undefined
      }
    } catch (error) {
      logger.error('[e-SUS] Erro na exportação em lote:', error)
      return {
        success: false,
        fichasCount: 0,
        errors: [String(error)]
      }
    }
  }

  /**
   * Gera o XML no formato e-SUS AB
   */
  private generateXML(fichas: FichaAtendimentoIndividual[]): string {
    const now = new Date()
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<dadoTransporteThrift>
  <uuidDadoSerializado>${ESUS_CONFIG.uuidDadosSerializados}</uuidDadoSerializado>
  <tipoDadoSerializado>${ESUS_CONFIG.tipoDadoSerializado}</tipoDadoSerializado>
  <codIbge>${process.env.ESUS_IBGE_CODE || '000000'}</codIbge>
  <cnesDadoSerializado>${ESUS_CONFIG.cnesDefault}</cnesDadoSerializado>
  <numLote>${format(now, 'yyyyMMddHHmmss')}</numLote>
  <fichasAtendimentoIndividual>`

    for (const ficha of fichas) {
      xml += this.fichaToXML(ficha)
    }

    xml += `
  </fichasAtendimentoIndividual>
</dadoTransporteThrift>`

    return xml
  }

  /**
   * Converte uma ficha para XML
   */
  private fichaToXML(ficha: FichaAtendimentoIndividual): string {
    let xml = `
    <fichaAtendimentoIndividual>
      <headerTransport>
        <uuidFicha>${ficha.headerTransport.uuidFicha}</uuidFicha>
        <cnes>${ficha.headerTransport.cnes}</cnes>
        ${ficha.headerTransport.ine ? `<ine>${ficha.headerTransport.ine}</ine>` : ''}
        <dataAtendimento>${ficha.headerTransport.dataAtendimento}</dataAtendimento>
        <codigoIbgeMunicipio>${ficha.headerTransport.codigoIbgeMunicipio}</codigoIbgeMunicipio>
      </headerTransport>
      ${ficha.numProntuario ? `<numProntuario>${ficha.numProntuario}</numProntuario>` : ''}
      ${ficha.dtNascimento ? `<dtNascimento>${ficha.dtNascimento}</dtNascimento>` : ''}
      ${ficha.sexo ? `<sexo>${ficha.sexo}</sexo>` : ''}
      ${ficha.localAtendimento ? `<localAtendimento>${ficha.localAtendimento}</localAtendimento>` : ''}
      ${ficha.tipoAtendimento ? `<tipoAtendimento>${ficha.tipoAtendimento}</tipoAtendimento>` : ''}`

    // Sinais vitais
    if (ficha.pesoAcompanhamentoNutricional) {
      xml += `
      <pesoAcompanhamentoNutricional>${ficha.pesoAcompanhamentoNutricional}</pesoAcompanhamentoNutricional>`
    }
    if (ficha.alturaAcompanhamentoNutricional) {
      xml += `
      <alturaAcompanhamentoNutricional>${ficha.alturaAcompanhamentoNutricional}</alturaAcompanhamentoNutricional>`
    }

    // Problemas/Condições
    if (ficha.problemaCondicaoAvaliada) {
      xml += `
      <problemaCondicaoAvaliada>`
      const p = ficha.problemaCondicaoAvaliada
      if (p.diabetes) xml += `<diabetes>true</diabetes>`
      if (p.hipertensaoArterial) xml += `<hipertensaoArterial>true</hipertensaoArterial>`
      if (p.prenatal) xml += `<prenatal>true</prenatal>`
      if (p.puericultura) xml += `<puericultura>true</puericultura>`
      if (p.puerpera) xml += `<puerpera>true</puerpera>`
      if (p.saudeMental) xml += `<saudeMental>true</saudeMental>`
      if (p.tuberculose) xml += `<tuberculose>true</tuberculose>`
      if (p.hanseniase) xml += `<hanseniase>true</hanseniase>`
      xml += `
      </problemaCondicaoAvaliada>`
    }

    // CID/CIAP
    if (ficha.cid && ficha.cid.length > 0) {
      xml += `
      <cid>`
      for (const code of ficha.cid) {
        xml += `<item>${code}</item>`
      }
      xml += `</cid>`
    }
    if (ficha.ciap && ficha.ciap.length > 0) {
      xml += `
      <ciap>`
      for (const code of ficha.ciap) {
        xml += `<item>${code}</item>`
      }
      xml += `</ciap>`
    }

    // Condutas
    if (ficha.condutaDesfecho) {
      xml += `
      <condutaDesfecho>`
      const c = ficha.condutaDesfecho
      if (c.encaminhamentoEspecializado) xml += `<encaminhamentoEspecializado>true</encaminhamentoEspecializado>`
      if (c.encaminhamentoHospitalar) xml += `<encaminhamentoHospitalar>true</encaminhamentoHospitalar>`
      if (c.encaminhamentoUrgencia) xml += `<encaminhamentoUrgencia>true</encaminhamentoUrgencia>`
      xml += `
      </condutaDesfecho>`
    }

    xml += `
    </fichaAtendimentoIndividual>`

    return xml
  }

  // ============ HELPERS ============

  /**
   * Mapeia tipo de atendimento para código e-SUS
   */
  private mapTipoAtendimento(consultation: {
    scheduledDemand: boolean
    immediateDemand: boolean
    orientationOnly: boolean
    prescriptionRenewal: boolean
  }): number {
    // 1=Consulta agendada programada
    // 2=Consulta agendada demanda espontânea  
    // 3=Escuta inicial/orientação
    // 4=Consulta no dia
    // 5=Atendimento de urgência
    // 6=Atendimento programado
    
    if (consultation.orientationOnly) return 3
    if (consultation.immediateDemand) return 4
    if (consultation.scheduledDemand) return 1
    if (consultation.prescriptionRenewal) return 6
    return 1 // Default: consulta agendada
  }

  /**
   * Gera UUID no formato e-SUS
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Verifica configuração do e-SUS
   */
  async checkConfig(): Promise<{
    configured: boolean
    cnes: string
    ine: string
    ibgeCode: string
    errors: string[]
  }> {
    const errors: string[] = []
    
    if (!ESUS_CONFIG.cnesDefault) {
      errors.push('ESUS_CNES não configurado')
    }
    if (!process.env.ESUS_IBGE_CODE) {
      errors.push('ESUS_IBGE_CODE não configurado')
    }

    return {
      configured: errors.length === 0,
      cnes: ESUS_CONFIG.cnesDefault,
      ine: ESUS_CONFIG.ineDefault,
      ibgeCode: process.env.ESUS_IBGE_CODE || '',
      errors
    }
  }

  /**
   * Lista lotes exportados
   */
  async listBatches(limit = 20): Promise<Array<{
    id: string
    batchId: string | null
    status: string
    submittedAt: Date
    processedAt: Date | null
    fichaType: string
  }>> {
    const batches = await prisma.eSUSSubmission.findMany({
      where: {
        fichaType: { contains: 'BATCH' }
      },
      orderBy: { submittedAt: 'desc' },
      take: limit
    })

    return batches
  }
}

// Singleton
export const ESUSService = new ESUSServiceClass()

// Tipos exportados
export type {
  FichaAtendimentoIndividual,
  FichaProcedimentos,
  FichaVisitaDomiciliar,
  ExportResult,
  HeaderTransport
}
