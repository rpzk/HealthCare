import { jsPDF } from 'jspdf'

interface ReceiptData {
  id: string
  date: Date
  patientName: string
  patientCpf?: string
  doctorName: string
  doctorCrm?: string
  amount: number
  description: string
  category: string
  paymentMethod?: string
  clinicName?: string
  clinicAddress?: string
  clinicCnpj?: string
}

export class ReceiptGenerator {
  static generate(data: ReceiptData): jsPDF {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(data.clinicName || 'HealthCare System', 105, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (data.clinicAddress) {
      doc.text(data.clinicAddress, 105, 28, { align: 'center' })
    }
    if (data.clinicCnpj) {
      doc.text(`CNPJ: ${data.clinicCnpj}`, 105, 34, { align: 'center' })
    }
    
    // Divider
    doc.setLineWidth(0.5)
    doc.line(20, 40, 190, 40)
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGAMENTO', 105, 50, { align: 'center' })
    
    // Receipt details
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    let yPos = 65
    
    doc.setFont('helvetica', 'bold')
    doc.text('Número do Recibo:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(data.id.slice(0, 8).toUpperCase(), 70, yPos)
    
    yPos += 8
    doc.setFont('helvetica', 'bold')
    doc.text('Data:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(data.date).toLocaleString('pt-BR'), 70, yPos)
    
    yPos += 12
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 190, yPos)
    
    // Patient info
    yPos += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO PACIENTE', 20, yPos)
    
    yPos += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Nome:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(data.patientName, 70, yPos)
    
    if (data.patientCpf) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('CPF:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.patientCpf, 70, yPos)
    }
    
    // Doctor info
    yPos += 12
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 190, yPos)
    
    yPos += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('PROFISSIONAL RESPONSÁVEL', 20, yPos)
    
    yPos += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Nome:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(data.doctorName, 70, yPos)
    
    if (data.doctorCrm) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('CRM:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.doctorCrm, 70, yPos)
    }
    
    // Service details
    yPos += 12
    doc.setLineWidth(0.3)
    doc.line(20, yPos, 190, yPos)
    
    yPos += 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SERVIÇOS PRESTADOS', 20, yPos)
    
    yPos += 8
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Descrição:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(data.description, 110)
    doc.text(descLines, 70, yPos)
    
    yPos += (descLines.length * 6)
    doc.setFont('helvetica', 'bold')
    doc.text('Categoria:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(data.category, 70, yPos)
    
    if (data.paymentMethod) {
      yPos += 6
      doc.setFont('helvetica', 'bold')
      doc.text('Forma de Pagamento:', 20, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(data.paymentMethod, 70, yPos)
    }
    
    // Total amount box
    yPos += 15
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos, 170, 15, 'F')
    doc.setLineWidth(0.5)
    doc.rect(20, yPos, 170, 15)
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('VALOR TOTAL:', 25, yPos + 10)
    doc.setFontSize(16)
    doc.text(
      `R$ ${data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      185,
      yPos + 10,
      { align: 'right' }
    )
    
    // Footer
    yPos += 25
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text(
      'Recibo gerado eletronicamente pelo HealthCare System',
      105,
      yPos,
      { align: 'center' }
    )
    
    yPos += 6
    doc.text(
      'Documento gerado eletronicamente. Consulte os registros do sistema para validação.',
      105,
      yPos,
      { align: 'center' }
    )
    
    return doc
  }

  static async generateAndDownload(data: ReceiptData): Promise<void> {
    const doc = this.generate(data)
    doc.save(`recibo-${data.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  static async generateBase64(data: ReceiptData): Promise<string> {
    const doc = this.generate(data)
    return doc.output('dataurlstring')
  }
}
