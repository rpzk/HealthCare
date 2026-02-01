'use client'

import React from 'react'
// @ts-ignore
import QRCode from 'qrcode.react'

export interface MedicationCFM {
  name: string
  concentration: string
  form: 'comprimido' | 'cápsula' | 'solução' | 'injeção' | 'pó' | 'pomada' | 'creme' | 'xarope'
  quantity: number
  quantityUnit: string
  isControlled: boolean
  quantityWritten?: string // Para medicamentos controlados: ex "trinta"
  posology: string
  observations?: string
  isAntimicrobial?: boolean
}

export interface DoctorCFM {
  name: string
  crm: string
  state: string
  rqe?: string
  specialty?: string
  cpf?: string
  address: string
  city: string
  phone?: string
  email?: string
  clinicName?: string
  clinicCnpj?: string
  logoUrl?: string
}

export interface PatientCFM {
  name: string
  cpf?: string
  dateOfBirth: Date
  address?: string
  phone?: string
}

export interface MedicalPrescriptionCFMProps {
  doctor: DoctorCFM
  patient: PatientCFM
  medications: MedicationCFM[]
  prescriptionId: string
  verificationUrl: string
  notes?: string
  createdAt?: Date
  hasDigitalSignature?: boolean
  signatureHashSha256?: string
}

/**
 * Componente de Prescrição Médica conforme padrões CFM
 * Segue: Manual de Orientações Básicas para Prescrição Médica (CFM)
 * Normas: Portaria 344/98 SVS/MS, Resolução CFM nº 2.299/2021
 */
export const MedicalPrescriptionCFM: React.FC<MedicalPrescriptionCFMProps> = ({
  doctor,
  patient,
  medications,
  prescriptionId,
  verificationUrl,
  notes,
  createdAt = new Date(),
  hasDigitalSignature = true,
  signatureHashSha256,
}) => {
  const calculateAge = (dateOfBirth: Date) => {
    const today = new Date()
    let age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--
    }
    return age
  }

  const hasAntibiotics = medications.some((m) => m.isAntimicrobial)
  const hasControlled = medications.some((m) => m.isControlled)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getValidityDate = () => {
    const validity = new Date(createdAt)
    validity.setDate(validity.getDate() + 10)
    return formatDate(validity)
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white text-gray-800 font-serif leading-relaxed">
      {/* ===== 1. CABEÇALHO ===== */}
      <header className="text-center border-b-2 border-gray-900 pb-6 mb-6 print:pb-6 print:mb-6">
        {/* Logo - se disponível */}
        {doctor.logoUrl && (
          <div className="mb-3 flex justify-center">
            <img src={doctor.logoUrl} alt="Logo" className="h-12 w-auto" />
          </div>
        )}

        {/* Nome do profissional */}
        <h1 className="text-lg font-bold uppercase tracking-wider">{doctor.name}</h1>

        {/* CRM e Especialidade */}
        <p className="text-xs mt-1 text-gray-700">
          <span className="font-semibold">Médico</span> · CRM-{doctor.state} {doctor.crm}
          {doctor.rqe && <span> · RQE {doctor.rqe}</span>}
        </p>

        {/* Especialidade */}
        {doctor.specialty && (
          <p className="text-xs text-gray-600 mt-0.5">{doctor.specialty}</p>
        )}

        {/* Endereço profissional */}
        <p className="text-xs text-gray-600 mt-1">{doctor.address}</p>
        <p className="text-xs text-gray-600">
          {doctor.city}
          {doctor.phone && ` · Tel: ${doctor.phone}`}
        </p>

        {/* CNPJ da clínica se aplicável */}
        {doctor.clinicName && (
          <p className="text-xs text-gray-600 mt-1 italic">
            {doctor.clinicName}
            {doctor.clinicCnpj && ` · CNPJ: ${doctor.clinicCnpj}`}
          </p>
        )}
      </header>

      {/* ===== 2. SUPERINSCRIÇÃO (Dados do Paciente) ===== */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold">Paciente:</span> {patient.name}
          </div>
          <div>
            <span className="font-semibold">Idade:</span> {calculateAge(patient.dateOfBirth)} anos
          </div>

          {patient.cpf && (
            <div className="col-span-2">
              <span className="font-semibold">CPF:</span> {patient.cpf}
            </div>
          )}

          {patient.dateOfBirth && (
            <div className="col-span-2">
              <span className="font-semibold">Data de Nascimento:</span>{' '}
              {formatDate(patient.dateOfBirth)}
            </div>
          )}

          {patient.address && (
            <div className="col-span-2">
              <span className="font-semibold">Endereço:</span> {patient.address}
            </div>
          )}
        </div>

        {/* Indicação de uso */}
        <div className="mt-4 text-center">
          <p className="text-base font-bold italic underline">USO INTERNO</p>
        </div>
      </section>

      {/* Aviso para antimicrobianos */}
      {hasAntibiotics && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm">
          <p className="font-bold text-yellow-900">⚠️ MEDICAMENTO SUJEITO A CONTROLE ESPECIAL</p>
          <p className="text-yellow-800 text-xs mt-1">
            Validade: {getValidityDate()} (10 dias)
          </p>
        </div>
      )}

      {/* Aviso para medicamentos controlados */}
      {hasControlled && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded text-sm">
          <p className="font-bold text-red-900">⚠️ MEDICAMENTO CONTROLADO - PORTARIA 344/98</p>
          <p className="text-red-800 text-xs mt-1">
            Verificar quantidade por extenso em cada medicamento
          </p>
        </div>
      )}

      {/* ===== 3. INSCRIÇÃO + 4. SUBINSCRIÇÃO + 5. ADSCRIÇÃO ===== */}
      <main className="space-y-8 min-h-96 mb-8">
        {medications.map((med, index) => (
          <div key={index} className="ml-4 print:ml-4">
            {/* Header: Número + Nome + Quantidade */}
            <div className="flex justify-between items-baseline border-b border-dotted border-gray-400 pb-1">
              <div>
                <span className="font-bold text-base">
                  {index + 1}. {med.name}
                </span>
                <span className="ml-2 text-sm text-gray-600">
                  {med.concentration} ({med.form})
                </span>
              </div>
              <div className="text-sm italic">
                <span className="font-semibold">{med.quantity}</span> {med.quantityUnit}
                {med.isControlled && med.quantityWritten && (
                  <span className="ml-1 font-bold">
                    ({med.quantityWritten.toUpperCase()})
                  </span>
                )}
              </div>
            </div>

            {/* Posologia */}
            <div className="mt-2">
              <p className="text-sm">
                <span className="font-semibold">Posologia:</span> {med.posology}
              </p>
            </div>

            {/* Observações */}
            {med.observations && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-semibold">Observações:</span> {med.observations}
              </p>
            )}

            {/* Aviso controlado */}
            {med.isControlled && (
              <p className="text-xs text-red-600 mt-1 font-semibold">🔒 CONTROLADO</p>
            )}

            {/* Aviso antimicrobiano */}
            {med.isAntimicrobial && (
              <p className="text-xs text-orange-600 mt-1 font-semibold">⚕️ ANTIMICROBIANO</p>
            )}
          </div>
        ))}
      </main>

      {/* Notas gerais */}
      {notes && (
        <div className="mb-8 p-3 bg-gray-50 rounded text-xs border border-gray-200">
          <p className="font-semibold mb-1">Observações Gerais:</p>
          <p className="text-gray-700">{notes}</p>
        </div>
      )}

      {/* ===== 6. FECHAMENTO ===== */}
      <footer className="mt-12 text-center print:mt-8">
        {/* Data e Local */}
        <p className="text-sm mb-1">
          <span className="font-semibold">{doctor.city}</span>, {formatDate(createdAt)}
        </p>

        {/* Número de prescrição */}
        <p className="text-xs text-gray-600 mb-8">Prescrição: {prescriptionId}</p>

        {/* Área de assinatura */}
        <div className="inline-block">
          <div className="border-t border-gray-900 w-64 mb-2"></div>
          <div className="text-center">
            <p className="text-sm font-bold uppercase">{doctor.name}</p>
            <p className="text-xs">CRM-{doctor.state} {doctor.crm}</p>
            {doctor.rqe && <p className="text-xs">RQE {doctor.rqe}</p>}
          </div>
        </div>

        {/* QR Code de Verificação Digital */}
        <div className="mt-8 flex flex-col items-center print:mt-6">
          <div className="border-2 border-gray-300 p-2 rounded inline-block mb-2">
            <QRCode
              value={verificationUrl}
              size={80}
              level="H"
              includeMargin={false}
              quiet={1}
            />
          </div>
          <p className="text-[10px] text-gray-600 max-w-xs">
            Prescrição eletrônica assinada digitalmente.
            <br />
            Verifique em{' '}
            <a href={verificationUrl} className="text-blue-600 underline">
              verificador.iti.br
            </a>
          </p>
        </div>

        {/* Indicação de assinatura digital */}
        {hasDigitalSignature && (
          <div className="mt-4 text-[9px] text-gray-500 print:text-[8px]">
            <p>✓ Documento assinado digitalmente conforme Resolução CFM nº 2.299/2021</p>
            {signatureHashSha256 && (
              <p className="font-mono text-[8px] mt-1 break-all">
                SHA-256: {signatureHashSha256}
              </p>
            )}
            <p>Timestamp: {createdAt.toISOString()}</p>
          </div>
        )}
      </footer>

      {/* Informação de conformidade */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center text-[9px] text-gray-500 print:mt-8 print:pt-4 print:text-[8px]">
        <p>
          Gerado conforme: Manual de Orientações Básicas para Prescrição Médica (CFM)
          <br />
          Portaria 344/98 SVS/MS · Resolução CFM nº 2.299/2021
          <br />
          NBR ISO/IEC 32000-1:2015 (PDF) · ABNT NBR 27001:2013 (Segurança)
        </p>
      </div>
    </div>
  )
}

export default MedicalPrescriptionCFM
