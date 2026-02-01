/**
 * Serviço de integração com Gateway de Pagamento
 * Suporta: MercadoPago, Stripe, PagSeguro, PIX, Crypto e RedotPay
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ========================================
// TIPOS
// ========================================

export type PaymentProvider = 'mercadopago' | 'stripe' | 'pagseguro' | 'pix' | 'crypto' | 'redotpay'
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
  },
  redotpay: {
    // Chave PIX da RedotPay - quando paciente paga, cai direto em crypto na sua carteira
    pixKey: process.env.REDOTPAY_PIX_KEY || '',
    merchantName: process.env.REDOTPAY_MERCHANT_NAME || process.env.PIX_MERCHANT_NAME || 'Clínica Saúde',
    merchantCity: process.env.REDOTPAY_MERCHANT_CITY || process.env.PIX_MERCHANT_CITY || 'São Paulo',
    // Tipo de crypto que será recebido (USDT, USDC, etc)
    cryptoType: process.env.REDOTPAY_CRYPTO_TYPE || 'USDT',
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
// REDOTPAY (PIX -> CRYPTO)
// ========================================

/**
 * RedotPay Service
 * 
 * Permite receber pagamentos via PIX que são automaticamente
 * convertidos para criptomoedas (USDT, USDC, etc) na sua carteira RedotPay.
 * 
 * Fluxo:
 * 1. Sistema gera QR Code PIX com a chave da RedotPay
 * 2. Paciente paga via PIX (banco tradicional)
 * 3. RedotPay recebe o PIX e converte para crypto
 * 4. Crypto cai direto na sua carteira RedotPay
 * 
 * Vantagens:
 * - Paciente paga via PIX (familiar, sem friction)
 * - Você recebe em crypto (proteção contra inflação)
 * - Sem taxas de conversão manuais
 * - Pode sacar como PIX ou manter em crypto
 */
class RedotPayService {
  private pixKey: string
  private merchantName: string
  private merchantCity: string
  private cryptoType: string

  constructor() {
    this.pixKey = PAYMENT_CONFIG.redotpay.pixKey
    this.merchantName = PAYMENT_CONFIG.redotpay.merchantName
    this.merchantCity = PAYMENT_CONFIG.redotpay.merchantCity
    this.cryptoType = PAYMENT_CONFIG.redotpay.cryptoType
  }

  /**
   * Gera QR Code PIX que deposita diretamente em crypto na RedotPay
   */
  async generatePixToCrypto(data: PaymentLinkData): Promise<PaymentResult> {
    if (!this.pixKey) {
      return { success: false, error: 'Chave PIX da RedotPay não configurada' }
    }

    try {
      // Gerar payload PIX apontando para a chave da RedotPay
      const payload = this.generatePixPayload({
        pixKey: this.pixKey,
        merchantName: this.merchantName,
        merchantCity: this.merchantCity,
        amount: data.amount,
        transactionId: data.transactionId,
        description: data.description,
      })

      logger.info('[RedotPay] PIX->Crypto gerado:', {
        transactionId: data.transactionId,
        amount: data.amount,
        cryptoType: this.cryptoType,
      })

      return {
        success: true,
        qrCode: `data:image/svg+xml;base64,${Buffer.from(this.generateQRCodeSVG(payload)).toString('base64')}`,
        qrCodeData: payload, // Código copia e cola
        pixKey: this.pixKey,
      }
    } catch (error) {
      logger.error('[RedotPay] Error:', error)
      return { success: false, error: 'Erro ao gerar código PIX RedotPay' }
    }
  }

  /**
   * Retorna informações sobre a configuração RedotPay
   */
  getConfig(): { cryptoType: string; pixKey: string; isConfigured: boolean } {
    return {
      cryptoType: this.cryptoType,
      pixKey: this.pixKey ? `${this.pixKey.substring(0, 4)}****` : '',
      isConfigured: !!this.pixKey,
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
    const { pixKey, merchantName, merchantCity, amount, transactionId } = params

    const payload = [
      { id: '00', value: '01' },
      { id: '26', value: [
        { id: '00', value: 'BR.GOV.BCB.PIX' },
        { id: '01', value: pixKey },
      ]},
      { id: '52', value: '0000' },
      { id: '53', value: '986' },
      { id: '54', value: amount.toFixed(2) },
      { id: '58', value: 'BR' },
      { id: '59', value: merchantName.toUpperCase().substring(0, 25) },
      { id: '60', value: merchantCity.toUpperCase().substring(0, 15) },
      { id: '62', value: [
        { id: '05', value: transactionId.substring(0, 25) },
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
    // Em produção, usar biblioteca 'qrcode' para gerar QR real
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="180" height="180" fill="#f0f0f0" rx="10"/>
      <text x="100" y="85" text-anchor="middle" font-size="12" fill="#333">PIX → Crypto</text>
      <text x="100" y="105" text-anchor="middle" font-size="10" fill="#666">RedotPay</text>
      <text x="100" y="130" text-anchor="middle" font-size="8" fill="#999">${this.cryptoType}</text>
    </svg>`
  }
}

// ========================================
// SERVIÇO PRINCIPAL
// ========================================

export class PaymentGatewayService {
  private mercadopago: MercadoPagoService
  private pix: PixService
  private redotpay: RedotPayService

  constructor() {
    this.mercadopago = new MercadoPagoService()
    this.pix = new PixService()
    this.redotpay = new RedotPayService()
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
      
      case 'redotpay':
        // PIX que cai direto em crypto na carteira RedotPay
        return this.redotpay.generatePixToCrypto(data)
      
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
   * Gera dados para pagamento em criptomoedas
   */
  async createCryptoPayment(data: PaymentLinkData): Promise<PaymentResult> {
    const cryptoConfig = {
      btcAddress: process.env.CRYPTO_BTC_ADDRESS || '',
      ethAddress: process.env.CRYPTO_ETH_ADDRESS || '',
      usdtAddress: process.env.CRYPTO_USDT_ADDRESS || '', // USDT na rede ERC-20 ou TRC-20
      network: process.env.CRYPTO_NETWORK || 'ethereum', // ethereum, tron, bitcoin
    }

    if (!cryptoConfig.btcAddress && !cryptoConfig.ethAddress && !cryptoConfig.usdtAddress) {
      return { success: false, error: 'Nenhum endereço de criptomoeda configurado' }
    }

    try {
      // Buscar cotação atual (em produção, usar API como CoinGecko ou Binance)
      const brlToUsd = 0.20 // Aproximado - em produção usar API
      const amountUsd = data.amount * brlToUsd

      // Cotações aproximadas (em produção, buscar de API)
      const btcPrice = 95000 // USD
      const ethPrice = 3200 // USD
      const usdtPrice = 1 // USD

      const cryptoAmounts = {
        btc: cryptoConfig.btcAddress ? (amountUsd / btcPrice).toFixed(8) : null,
        eth: cryptoConfig.ethAddress ? (amountUsd / ethPrice).toFixed(6) : null,
        usdt: cryptoConfig.usdtAddress ? amountUsd.toFixed(2) : null,
      }

      // Gerar dados de pagamento
      const paymentData = {
        transactionId: data.transactionId,
        amountBrl: data.amount,
        amountUsd: amountUsd.toFixed(2),
        crypto: {
          bitcoin: cryptoConfig.btcAddress ? {
            address: cryptoConfig.btcAddress,
            amount: cryptoAmounts.btc,
            network: 'Bitcoin',
            qrUri: `bitcoin:${cryptoConfig.btcAddress}?amount=${cryptoAmounts.btc}&message=${encodeURIComponent(data.description)}`,
          } : null,
          ethereum: cryptoConfig.ethAddress ? {
            address: cryptoConfig.ethAddress,
            amount: cryptoAmounts.eth,
            network: 'Ethereum',
            qrUri: `ethereum:${cryptoConfig.ethAddress}?value=${parseFloat(cryptoAmounts.eth!) * 1e18}`,
          } : null,
          usdt: cryptoConfig.usdtAddress ? {
            address: cryptoConfig.usdtAddress,
            amount: cryptoAmounts.usdt,
            network: cryptoConfig.network === 'tron' ? 'Tron (TRC-20)' : 'Ethereum (ERC-20)',
          } : null,
        },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
        instructions: 'Após o pagamento, envie o hash da transação para confirmação.',
      }

      logger.info('[Crypto] Payment data generated:', {
        transactionId: data.transactionId,
        amountBrl: data.amount,
        amountUsd,
      })

      return {
        success: true,
        paymentId: data.transactionId,
        qrCodeData: JSON.stringify(paymentData),
      }
    } catch (error) {
      logger.error('[Crypto] Error generating payment:', error)
      return { success: false, error: 'Erro ao gerar dados de pagamento crypto' }
    }
  }

  /**
   * Verifica pagamento crypto na blockchain
   * Usa APIs públicas: Etherscan, Blockchain.com, TronScan
   */
  async verifyCryptoPayment(
    network: 'bitcoin' | 'ethereum' | 'tron',
    txHash: string,
    expectedAmount: number,
    expectedAddress: string
  ): Promise<{ verified: boolean; confirmations?: number; error?: string }> {
    try {
      logger.info('[Crypto] Verification requested:', {
        network,
        txHash,
        expectedAmount,
        expectedAddress,
      })

      switch (network) {
        case 'bitcoin':
          return this.verifyBitcoinTx(txHash, expectedAmount, expectedAddress)
        case 'ethereum':
          return this.verifyEthereumTx(txHash, expectedAmount, expectedAddress)
        case 'tron':
          return this.verifyTronTx(txHash, expectedAmount, expectedAddress)
        default:
          return { verified: false, error: 'Rede não suportada' }
      }
    } catch (error) {
      logger.error('[Crypto] Verification error:', error)
      return { verified: false, error: 'Erro ao verificar transação' }
    }
  }

  /**
   * Verifica transação Bitcoin via Blockchain.com API
   */
  private async verifyBitcoinTx(
    txHash: string,
    expectedBtc: number,
    expectedAddress: string
  ): Promise<{ verified: boolean; confirmations?: number; error?: string }> {
    try {
      const response = await fetch(`https://blockchain.info/rawtx/${txHash}`)
      
      if (!response.ok) {
        return { verified: false, error: 'Transação não encontrada na blockchain' }
      }

      const tx = await response.json()
      
      // Verificar se o endereço de destino recebeu o valor esperado
      const output = tx.out?.find((o: any) => 
        o.addr?.toLowerCase() === expectedAddress.toLowerCase()
      )

      if (!output) {
        return { verified: false, error: 'Endereço de destino não encontrado na transação' }
      }

      const receivedBtc = output.value / 100000000 // satoshis para BTC
      const tolerance = 0.0001 // Tolerância para variações de taxa

      if (receivedBtc < expectedBtc - tolerance) {
        return { 
          verified: false, 
          error: `Valor insuficiente. Esperado: ${expectedBtc} BTC, Recebido: ${receivedBtc} BTC` 
        }
      }

      // Verificar confirmações (recomendado: >= 3 para segurança)
      const confirmations = tx.block_height 
        ? Math.max(0, Date.now() / 1000 / 600 - tx.block_height) // Estimativa
        : 0

      return { 
        verified: true, 
        confirmations: Math.floor(confirmations)
      }
    } catch (error) {
      logger.error('[Bitcoin] Verification error:', error)
      return { verified: false, error: 'Erro ao consultar blockchain Bitcoin' }
    }
  }

  /**
   * Verifica transação Ethereum via Etherscan API
   */
  private async verifyEthereumTx(
    txHash: string,
    expectedEth: number,
    expectedAddress: string
  ): Promise<{ verified: boolean; confirmations?: number; error?: string }> {
    try {
      const apiKey = process.env.ETHERSCAN_API_KEY || ''
      const apiUrl = apiKey 
        ? `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
        : `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}`

      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        return { verified: false, error: 'Erro ao consultar Etherscan' }
      }

      const data = await response.json()
      const tx = data.result

      if (!tx || tx === 'null') {
        return { verified: false, error: 'Transação não encontrada' }
      }

      // Verificar endereço de destino
      if (tx.to?.toLowerCase() !== expectedAddress.toLowerCase()) {
        return { verified: false, error: 'Endereço de destino não confere' }
      }

      // Converter valor de wei para ETH
      const receivedWei = parseInt(tx.value, 16)
      const receivedEth = receivedWei / 1e18
      const tolerance = 0.0001

      if (receivedEth < expectedEth - tolerance) {
        return { 
          verified: false, 
          error: `Valor insuficiente. Esperado: ${expectedEth} ETH, Recebido: ${receivedEth} ETH` 
        }
      }

      // Buscar número de confirmações
      const blockResponse = await fetch(
        apiKey 
          ? `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`
          : `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber`
      )
      const blockData = await blockResponse.json()
      const currentBlock = parseInt(blockData.result, 16)
      const txBlock = parseInt(tx.blockNumber, 16)
      const confirmations = currentBlock - txBlock

      return { 
        verified: confirmations >= 12, // 12 confirmações para segurança
        confirmations 
      }
    } catch (error) {
      logger.error('[Ethereum] Verification error:', error)
      return { verified: false, error: 'Erro ao consultar blockchain Ethereum' }
    }
  }

  /**
   * Verifica transação USDT TRC-20 via TronScan API
   */
  private async verifyTronTx(
    txHash: string,
    expectedUsdt: number,
    expectedAddress: string
  ): Promise<{ verified: boolean; confirmations?: number; error?: string }> {
    try {
      const response = await fetch(
        `https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`
      )
      
      if (!response.ok) {
        return { verified: false, error: 'Erro ao consultar TronScan' }
      }

      const tx = await response.json()

      if (!tx || tx.contractRet !== 'SUCCESS') {
        return { verified: false, error: 'Transação não confirmada ou falhou' }
      }

      // Para USDT TRC-20, verificar os eventos de transferência
      const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // Contrato USDT TRC-20
      
      const transferInfo = tx.trc20TransferInfo?.find((t: any) => 
        t.contract_address === usdtContract &&
        t.to_address?.toLowerCase() === expectedAddress.toLowerCase()
      )

      if (!transferInfo) {
        return { verified: false, error: 'Transferência USDT não encontrada na transação' }
      }

      const receivedUsdt = parseFloat(transferInfo.amount_str) / 1e6 // USDT tem 6 decimais
      const tolerance = 0.01

      if (receivedUsdt < expectedUsdt - tolerance) {
        return { 
          verified: false, 
          error: `Valor insuficiente. Esperado: ${expectedUsdt} USDT, Recebido: ${receivedUsdt} USDT` 
        }
      }

      return { 
        verified: tx.confirmed, 
        confirmations: tx.confirmed ? 19 : 0 // Tron confirma rápido
      }
    } catch (error) {
      logger.error('[Tron] Verification error:', error)
      return { verified: false, error: 'Erro ao consultar blockchain Tron' }
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

  /**
   * Lista provedores de pagamento disponíveis (configurados)
   */
  getAvailableProviders(): {
    provider: PaymentProvider
    name: string
    description: string
    isConfigured: boolean
    icon: string
  }[] {
    return [
      {
        provider: 'pix',
        name: 'PIX',
        description: 'Pagamento instantâneo via PIX (recebe em R$)',
        isConfigured: !!PAYMENT_CONFIG.pix.pixKey,
        icon: '💰'
      },
      {
        provider: 'redotpay',
        name: 'PIX → Crypto (RedotPay)',
        description: 'Paciente paga via PIX, você recebe em crypto (USDT)',
        isConfigured: !!PAYMENT_CONFIG.redotpay.pixKey,
        icon: '🔷'
      },
      {
        provider: 'mercadopago',
        name: 'Mercado Pago',
        description: 'Cartão de crédito/débito, boleto, PIX',
        isConfigured: !!PAYMENT_CONFIG.mercadopago.accessToken,
        icon: '💳'
      },
      {
        provider: 'crypto',
        name: 'Criptomoedas',
        description: 'Bitcoin, Ethereum, USDT (direto na carteira)',
        isConfigured: !!(process.env.CRYPTO_BTC_ADDRESS || process.env.CRYPTO_ETH_ADDRESS || process.env.CRYPTO_USDT_ADDRESS),
        icon: '₿'
      },
      {
        provider: 'stripe',
        name: 'Stripe',
        description: 'Cartões internacionais',
        isConfigured: !!PAYMENT_CONFIG.stripe.secretKey,
        icon: '💵'
      },
      {
        provider: 'pagseguro',
        name: 'PagSeguro',
        description: 'Cartão, boleto, transferência',
        isConfigured: !!PAYMENT_CONFIG.pagseguro.token,
        icon: '🏦'
      },
    ]
  }

  /**
   * Retorna configuração da RedotPay
   */
  getRedotPayConfig() {
    return this.redotpay.getConfig()
  }
}

// Exportar instância singleton
export const paymentGateway = new PaymentGatewayService()
