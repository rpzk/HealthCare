/**
 * Serviço de integração com Gateway de Pagamento
 * Suporta: MercadoPago, Stripe, PagSeguro e PIX
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ========================================
// TIPOS
// ========================================

export type PaymentProvider = 'mercadopago' | 'stripe' | 'pagseguro' | 'pix'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'

export interface PaymentLinkData {
  amount: number
  description: string
  patientEmail?: string
  patientName?: string
  patientPhone?: string
  transactionId: string
  installments?: number // Número de parcelas (1-12)
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  paymentUrl?: string
  qrCode?: string // Para PIX
  qrCodeData?: string // Código copia e cola PIX
  pixKey?: string
  error?: string
}

export interface WebhookPayment {
  provider: PaymentProvider
  paymentId: string
  status: PaymentStatus
  amount: number
  paidAt?: Date
  metadata?: Record<string, any>
}

// ========================================
// CONFIGURAÇÃO
// ========================================

const PAYMENT_CONFIG = {
  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publicKey: process.env.STRIPE_PUBLIC_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  pagseguro: {
    email: process.env.PAGSEGURO_EMAIL || '',
    token: process.env.PAGSEGURO_TOKEN || '',
  },
  pix: {
    pixKey: process.env.PIX_KEY || '', // Email, telefone, CPF ou chave aleatória
    merchantName: process.env.PIX_MERCHANT_NAME || 'Clínica Saúde',
    merchantCity: process.env.PIX_MERCHANT_CITY || 'São Paulo',
  }
}

// ========================================
// MERCADOPAGO
// ========================================

class MercadoPagoService {
  private accessToken: string

  constructor() {
    this.accessToken = PAYMENT_CONFIG.mercadopago.accessToken
  }

  async createPaymentLink(data: PaymentLinkData): Promise<PaymentResult> {
    if (!this.accessToken) {
      return { success: false, error: 'MercadoPago não configurado' }
    }

    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            title: data.description,
            quantity: 1,
            unit_price: data.amount,
            currency_id: 'BRL',
          }],
          payer: {
            name: data.patientName,
            email: data.patientEmail,
            phone: {
              area_code: data.patientPhone?.substring(0, 2),
              number: data.patientPhone?.substring(2),
            }
          },
          payment_methods: {
            installments: data.installments || 12,
            default_installments: 1,
          },
          back_urls: {
            success: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL}/payment/failure`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL}/payment/pending`,
          },
          auto_return: 'approved',
          external_reference: data.transactionId,
          notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Erro ao criar link de pagamento' }
      }

      const result = await response.json()
      
      return {
        success: true,
        paymentId: result.id,
        paymentUrl: result.init_point, // Link de pagamento
      }
    } catch (error) {
      logger.error('[MercadoPago] Error:', error)
      return { success: false, error: 'Erro ao conectar com MercadoPago' }
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      })

      if (!response.ok) return 'pending'

      const payment = await response.json()
      
      const statusMap: Record<string, PaymentStatus> = {
        'approved': 'approved',
        'pending': 'pending',
        'rejected': 'rejected',
        'cancelled': 'cancelled',
        'refunded': 'refunded',
      }

      return statusMap[payment.status] || 'pending'
    } catch (error) {
      logger.error('[MercadoPago] Error checking status:', error)
      return 'pending'
    }
  }
}

// ========================================
// PIX (Geração Manual)
// ========================================

class PixService {
  async generatePixCode(data: PaymentLinkData): Promise<PaymentResult> {
    const { pixKey, merchantName, merchantCity } = PAYMENT_CONFIG.pix

    if (!pixKey) {
      return { success: false, error: 'Chave PIX não configurada' }
    }

    try {
      // Gerar payload PIX estático (EMV)
      const payload = this.generatePixPayload({
        pixKey,
        merchantName,
        merchantCity,
        amount: data.amount,
        transactionId: data.transactionId,
        description: data.description,
      })

      // Em produção, você usaria uma lib como 'pix-utils' ou 'qrcode' para gerar o QR Code
      const qrCodeData = payload

      return {
        success: true,
        qrCode: `data:image/svg+xml;base64,${Buffer.from(this.generateQRCodeSVG(payload)).toString('base64')}`,
        qrCodeData: payload,
        pixKey,
      }
    } catch (error) {
      logger.error('[PIX] Error:', error)
      return { success: false, error: 'Erro ao gerar código PIX' }
    }
  }

  private generatePixPayload(params: {
    pixKey: string
    merchantName: string
    merchantCity: string
    amount: number
    transactionId: string
    description: string
  }): string {
    // Implementação simplificada do padrão EMV PIX
    // Em produção, use biblioteca especializada como 'pix-utils'
    
    const { pixKey, merchantName, merchantCity, amount, transactionId } = params

    // IDs conforme especificação BACEN
    const payload = [
      { id: '00', value: '01' }, // Payload Format Indicator
      { id: '26', value: [ // Merchant Account Information
        { id: '00', value: 'BR.GOV.BCB.PIX' },
        { id: '01', value: pixKey },
      ]},
      { id: '52', value: '0000' }, // Merchant Category Code
      { id: '53', value: '986' }, // Transaction Currency (BRL)
      { id: '54', value: amount.toFixed(2) }, // Transaction Amount
      { id: '58', value: merchantCity.toUpperCase().substring(0, 15) }, // Merchant City
      { id: '59', value: merchantName.toUpperCase().substring(0, 25) }, // Merchant Name
      { id: '62', value: [
        { id: '05', value: transactionId.substring(0, 25) }, // Reference Label
      ]},
    ]

    const payloadStr = this.encodePixPayload(payload)
    const crc = this.calculateCRC16(payloadStr + '6304')
    
    return payloadStr + '6304' + crc
  }

  private encodePixPayload(items: any[]): string {
    let result = ''
    for (const item of items) {
      if (Array.isArray(item.value)) {
        const subPayload = this.encodePixPayload(item.value)
        result += item.id + String(subPayload.length).padStart(2, '0') + subPayload
      } else {
        result += item.id + String(item.value.length).padStart(2, '0') + item.value
      }
    }
    return result
  }

  private calculateCRC16(payload: string): string {
    // CRC-16-CCITT polynomial
    let crc = 0xFFFF
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
      }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')
  }

  private generateQRCodeSVG(data: string): string {
    // QR Code SVG simples (em produção use lib 'qrcode' ou similar)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="white"/>
      <text x="50" y="50" text-anchor="middle" font-size="8">QR Code PIX</text>
      <text x="50" y="60" text-anchor="middle" font-size="4">${data.substring(0, 20)}...</text>
    </svg>`
  }
}

// ========================================
// SERVIÇO PRINCIPAL
// ========================================

export class PaymentGatewayService {
  private mercadopago: MercadoPagoService
  private pix: PixService

  constructor() {
    this.mercadopago = new MercadoPagoService()
    this.pix = new PixService()
  }

  /**
   * Cria link de pagamento no provedor escolhido
   */
  async createPaymentLink(
    provider: PaymentProvider,
    data: PaymentLinkData
  ): Promise<PaymentResult> {
    switch (provider) {
      case 'mercadopago':
        return this.mercadopago.createPaymentLink(data)
      
      case 'pix':
        return this.pix.generatePixCode(data)
      
      case 'stripe':
        // TODO: Implementar Stripe
        return { success: false, error: 'Stripe ainda não implementado' }
      
      case 'pagseguro':
        // TODO: Implementar PagSeguro
        return { success: false, error: 'PagSeguro ainda não implementado' }
      
      default:
        return { success: false, error: 'Provedor não suportado' }
    }
  }

  /**
   * Verifica status de pagamento
   */
  async checkPaymentStatus(
    provider: PaymentProvider,
    paymentId: string
  ): Promise<PaymentStatus> {
    switch (provider) {
      case 'mercadopago':
        return this.mercadopago.getPaymentStatus(paymentId)
      
      default:
        return 'pending'
    }
  }

  /**
   * Processa webhook de pagamento
   */
  async processWebhook(
    provider: PaymentProvider,
    webhookData: any
  ): Promise<WebhookPayment | null> {
    switch (provider) {
      case 'mercadopago':
        return this.processMercadoPagoWebhook(webhookData)
      
      default:
        return null
    }
  }

  private async processMercadoPagoWebhook(data: any): Promise<WebhookPayment | null> {
    try {
      // MercadoPago envia o ID do pagamento
      const paymentId = data.data?.id || data.id

      if (!paymentId) return null

      const status = await this.mercadopago.getPaymentStatus(paymentId)

      return {
        provider: 'mercadopago',
        paymentId,
        status,
        amount: data.transaction_amount || 0,
        paidAt: data.date_approved ? new Date(data.date_approved) : undefined,
        metadata: data,
      }
    } catch (error) {
      logger.error('[Webhook] Error processing MercadoPago:', error)
      return null
    }
  }

  /**
   * Atualiza transação financeira após pagamento
   */
  async updateTransactionFromPayment(
    transactionId: string,
    payment: WebhookPayment
  ): Promise<boolean> {
    try {
      if (payment.status === 'approved') {
        await prisma.financialTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'PAID',
            paidDate: payment.paidAt || new Date(),
            paymentMethod: `${payment.provider.toUpperCase()} - ${payment.paymentId}`,
          }
        })
        return true
      }

      if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await prisma.financialTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'CANCELLED',
          }
        })
        return true
      }

      return false
    } catch (error) {
      logger.error('[PaymentGateway] Error updating transaction:', error)
      return false
    }
  }

  /**
   * Envia link de pagamento via WhatsApp
   */
  async sendPaymentLinkWhatsApp(
    phoneNumber: string,
    patientName: string,
    paymentUrl: string,
    amount: number
  ): Promise<boolean> {
    try {
      // Integra com WhatsAppService já existente
      const { WhatsAppService } = await import('./whatsapp-service')
      
      const message = `Olá ${patientName}! 👋\n\n` +
        `Segue o link para pagamento da sua consulta:\n\n` +
        `💰 Valor: R$ ${amount.toFixed(2)}\n` +
        `🔗 Link: ${paymentUrl}\n\n` +
        `Você pode parcelar em até 12x no cartão de crédito ou pagar via PIX.\n\n` +
        `Qualquer dúvida, estamos à disposição!`

      return await WhatsAppService.sendMessage({ to: phoneNumber, message })
    } catch (error) {
      logger.error('[PaymentGateway] Error sending WhatsApp:', error)
      return false
    }
  }
}

// Exportar instância singleton
export const paymentGateway = new PaymentGatewayService()
