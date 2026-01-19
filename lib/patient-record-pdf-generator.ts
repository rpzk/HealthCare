import { jsPDF } from 'jspdf'

interface PatientData {
  patient: {
    name: string
    cpf?: string | null
    email?: string | null
    birthDate?: Date | null
    phone?: string | null
  }
  appointments: Array<{
    date: Date
    status: string
    notes?: string | null
  }>
  prescriptions: Array<{
    createdAt: Date
    medications: string
    notes?: string | null
  }>
  medicalRecords: Array<{
    createdAt: Date
    chiefComplaint?: string | null
    diagnosis?: string | null
    treatment?: string | null
  }>
}

export class PatientRecordPDFGenerator {
  static generate(data: PatientData): jsPDF {
    const doc = new jsPDF()
    let yPos = 20

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('PRONTUÁRIO MÉDICO', 105, yPos, { align: 'center' })
    
    yPos += 15
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)
    
    // Patient Info
    yPos += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO PACIENTE', 20, yPos)
    
    yPos += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Nome:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(data.patient.name, 50, yPos)
    
    if (data.patient.cpf) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('CPF:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.patient.cpf, 50, yPos)
    }
    
    if (data.patient.birthDate) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Nascimento:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(data.patient.birthDate).toLocaleDateString('pt-BR'), 50, yPos)
    }
    
    if (data.patient.email) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Email:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.patient.email, 50, yPos)
    }
    
    if (data.patient.phone) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Telefone:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.patient.phone, 50, yPos)
    }
    
    // Medical Records
    if (data.medicalRecords.length > 0) {
      yPos += 12
      doc.setLineWidth(0.3)
      doc.line(20, yPos, 190, yPos)
      
      yPos += 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('CONSULTAS MÉDICAS', 20, yPos)
      
      data.medicalRecords.slice(0, 5).forEach((record) => {
        yPos += 8
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Data: ${new Date(record.createdAt).toLocaleDateString('pt-BR')}`, 20, yPos)
        
        if (record.chiefComplaint) {
          yPos += 5
          doc.setFont('helvetica', 'normal')
          const lines = doc.splitTextToSize(`Queixa: ${record.chiefComplaint}`, 170)
          doc.text(lines, 20, yPos)
          yPos += lines.length * 5
        }
        
        if (record.diagnosis) {
          yPos += 5
          doc.setFont('helvetica', 'normal')
          const lines = doc.splitTextToSize(`Diagnóstico: ${record.diagnosis}`, 170)
          doc.text(lines, 20, yPos)
          yPos += lines.length * 5
        }
      })
    }
    
    // Prescriptions
    if (data.prescriptions.length > 0) {
      yPos += 12
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setLineWidth(0.3)
      doc.line(20, yPos, 190, yPos)
      
      yPos += 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('PRESCRIÇÕES', 20, yPos)
      
      data.prescriptions.slice(0, 5).forEach((prescription) => {
        yPos += 8
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`Data: ${new Date(prescription.createdAt).toLocaleDateString('pt-BR')}`, 20, yPos)
        
        yPos += 5
        doc.setFont('helvetica', 'normal')
        const medLines = doc.splitTextToSize(`Medicamentos: ${prescription.medications}`, 170)
        doc.text(medLines, 20, yPos)
        yPos += medLines.length * 5
      })
    }
    
    // Appointments
    if (data.appointments.length > 0) {
      yPos += 12
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setLineWidth(0.3)
      doc.line(20, yPos, 190, yPos)
      
      yPos += 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('AGENDAMENTOS', 20, yPos)
      
      data.appointments.slice(0, 10).forEach((appointment) => {
        yPos += 6
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `${new Date(appointment.date).toLocaleDateString('pt-BR')} - ${appointment.status}`,
          20,
          yPos
        )
      })
    }
    
    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Página ${i} de ${totalPages} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
        105,
        290,
        { align: 'center' }
      )
    }
    
    return doc
  }
}
