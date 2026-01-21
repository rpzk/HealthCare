/**
 * Templates padrão para documentos
 */

export const DEFAULT_TEMPLATES = {
  prescription: {
    name: 'Prescrição Padrão',
    documentType: 'prescription',
    description: 'Template padrão para prescrições médicas',
    htmlTemplate: `
<div class="print-prescription" style="padding: 20mm; font-family: Arial, sans-serif; max-width: 210mm;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 20mm; border-bottom: 2px solid #333; padding-bottom: 10mm;">
    {{#if clinic.header}}<div style="margin-bottom: 10mm;">{{clinic.header}}</div>{{/if}}
    {{#if clinic.logo}}<div style="margin-bottom: 10mm;">{{clinic.logo}}</div>{{/if}}
    <h2 style="margin: 0 0 5mm 0; font-size: 18pt;">{{clinic.name}}</h2>
    {{#if clinic.address}}
      <p style="margin: 3px 0; font-size: 10pt;">
        {{clinic.address}} - {{clinic.city}}, {{clinic.state}} {{clinic.zipCode}}
      </p>
    {{/if}}
    {{#if clinic.phone}}
      <p style="margin: 3px 0; font-size: 10pt;">Telefone: {{clinic.phone}}</p>
    {{/if}}
  </div>

  <!-- Dados do Médico -->
  <div style="margin-bottom: 15mm; padding-bottom: 10mm; border-bottom: 1px solid #ccc;">
    <strong style="font-size: 11pt;">{{doctor.name}}</strong><br>
    {{#if doctor.speciality}}<span style="font-size: 10pt;">{{doctor.speciality}}</span><br>{{/if}}
    {{#if doctor.crmNumber}}<span style="font-size: 10pt;">CRM {{doctor.crmNumber}} - {{doctor.licenseState}}</span>{{/if}}
  </div>

  <!-- Data e Paciente -->
  <div style="margin-bottom: 15mm;">
    <table style="width: 100%; font-size: 10pt;">
      <tr>
        <td><strong>Data:</strong> {{document.date}}</td>
        <td style="text-align: right;"><strong>Paciente:</strong> {{patient.name}}</td>
      </tr>
    </table>
  </div>

  <!-- Prescrição -->
  <div style="margin-bottom: 30mm;">
    <h3 style="border-bottom: 2px solid #000; padding-bottom: 5mm; margin: 0 0 10mm 0; font-size: 12pt;">PRESCRIÇÃO MÉDICA</h3>
    <div style="min-height: 100mm; font-size: 11pt; line-height: 2;">
      <!-- Espaço para medicamentos -->
      [MEDICAMENTOS SERÃO LISTADOS AQUI]
    </div>
  </div>

  <!-- Observações -->
  <div style="margin-bottom: 30mm; padding: 10mm; border: 1px solid #ccc; border-radius: 4px;">
    <strong style="font-size: 11pt;">Observações:</strong>
    <div style="font-size: 10pt; min-height: 30mm; margin-top: 5mm;">
      [OBSERVAÇÕES DO MÉDICO]
    </div>
  </div>

  <!-- Assinatura -->
  <div style="margin-top: 40mm;">
    <div style="text-align: center;">
      <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto 5mm; height: 50px;"></div>
      <strong>{{doctor.name}}</strong><br>
      {{#if doctor.crmNumber}}CRM {{doctor.crmNumber}} - {{doctor.licenseState}}{{/if}}
    </div>
  </div>

  <!-- QR Code (rodapé) -->
  {{#if document.qrcode}}
  <div style="position: absolute; bottom: 10mm; right: 10mm; text-align: center;">
    {{document.qrcode}}
    <p style="margin-top: 5px; font-size: 8pt;">Validação Digital</p>
  </div>
  {{/if}}

  <!-- Rodapé -->
  {{#if clinic.footer}}
  <div style="position: absolute; bottom: 5mm; left: 10mm; right: 10mm; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 5mm;">
    {{clinic.footer}}
  </div>
  {{/if}}
</div>
    `.trim(),
    cssTemplate: `
.print-prescription {
  position: relative;
  page-break-after: always;
}

@media print {
  .print-prescription {
    padding: 0;
    margin: 0;
  }
}
    `.trim(),
    config: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: 20, right: 20, bottom: 30, left: 20 },
    },
    signaturePosition: 'bottom-center',
    signatureSize: 'medium',
    qrcodePosition: 'bottom-right',
    qrcodeSize: '1cm',
    showQrcode: true,
  },

  certificate: {
    name: 'Atestado Médico Padrão',
    documentType: 'certificate',
    description: 'Template padrão para atestados médicos',
    htmlTemplate: `
<div class="print-certificate" style="padding: 30mm; font-family: 'Times New Roman', serif; max-width: 210mm; min-height: 297mm; display: flex; flex-direction: column; justify-content: center;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30mm;">
    {{#if clinic.header}}<div style="margin-bottom: 20mm;">{{clinic.header}}</div>{{/if}}
    {{#if clinic.logo}}<div style="margin-bottom: 20mm;">{{clinic.logo}}</div>{{/if}}
    <h1 style="margin: 0; font-size: 24pt; font-weight: normal;">{{clinic.name}}</h1>
    {{#if clinic.address}}
      <p style="margin: 5px 0; font-size: 11pt;">
        {{clinic.address}} - {{clinic.city}}, {{clinic.state}}
      </p>
    {{/if}}
  </div>

  <!-- Título do Atestado -->
  <div style="text-align: center; margin-bottom: 20mm;">
    <h2 style="margin: 0; font-size: 16pt; text-transform: uppercase;">A T E S T A D O M É D I C O</h2>
  </div>

  <!-- Conteúdo -->
  <div style="text-align: justify; margin-bottom: 20mm; font-size: 12pt; line-height: 1.8;">
    <p>
      Atestamos para os devidos fins que o(a) paciente <strong>{{patient.name}}</strong>, 
      CPF {{patient.cpf}}, nascido(a) em {{patient.birthDate}}, 
      foi por nós atendido(a) em {{document.date}} e encontra-se apto(a) para retornar às suas atividades normais.
    </p>
    
    <p style="margin-top: 15mm;">
      Observações: [ADICIONE AQUI AS OBSERVAÇÕES MÉDICAS]
    </p>
  </div>

  <!-- Assinatura -->
  <div style="margin-top: 40mm;">
    <table style="width: 100%;">
      <tr>
        <td style="text-align: center; width: 50%;">
          <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto 10mm;"></div>
          <strong>{{doctor.name}}</strong><br>
          {{#if doctor.crmNumber}}CRM {{doctor.crmNumber}} - {{doctor.licenseState}}{{/if}}
        </td>
        <td style="text-align: center; width: 50%;">
          <p style="font-size: 10pt;">{{document.date}}</p>
        </td>
      </tr>
    </table>
  </div>
</div>
    `.trim(),
    cssTemplate: `
.print-certificate {
  position: relative;
  page-break-after: always;
}

@media print {
  .print-certificate {
    padding: 0;
    margin: 0;
    height: 100vh;
  }
}
    `.trim(),
    config: {
      pageSize: 'A4',
      orientation: 'portrait',
    },
    signaturePosition: 'bottom-left',
    signatureSize: 'large',
    showQrcode: false,
  },
}

/**
 * Seed function para inserir templates padrão
 */
export async function seedDefaultTemplates(userId: string) {
  const { DocumentTemplateService } = await import('./service')

  const templates = Object.values(DEFAULT_TEMPLATES)

  for (const template of templates) {
    try {
      await DocumentTemplateService.createTemplate(
        {
          ...template,
          isDefault: true,
          isActive: true,
        },
        userId
      )
      logger.info(`✓ Template "${template.name}" criado com sucesso`)
    } catch (error) {
      logger.error(`✗ Erro ao criar template "${template.name}":`, error)
    }
  }
}
