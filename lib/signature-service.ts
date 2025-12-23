import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

/**
 * Signature Service - Digital signing for medical certificates
 * 
 * Supports:
 * - PKI_LOCAL: Self-signed RSA 2048 certificates (ready now)
 * - ICP_BRASIL: Official ICP-Brasil certificates (hooks for future)
 */

export type SignatureMethod = 'NONE' | 'PKI_LOCAL' | 'ICP_BRASIL'

interface SignatureResult {
  signature: string
  method: SignatureMethod
  timestamp: Date
}

interface VerificationResult {
  valid: boolean
  method: SignatureMethod
  timestamp?: Date
  message: string
}

// ============================================
// PKI LOCAL: Self-signed RSA certificates
// ============================================

/**
 * Sign certificate data using local private key
 * Generates SHA-256 hash and RSA signature
 */
export function signWithPKILocal(
  data: string,
  privateKeyPath: string = 'private/clinic-key.pem'
): SignatureResult {
  try {
    const fullPath = path.resolve(privateKeyPath)
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Private key not found at ${fullPath}`)
    }

    const privateKey = fs.readFileSync(fullPath, 'utf-8')
    const sign = crypto.createSign('sha256')
    sign.update(data)
    const signature = sign.sign(privateKey, 'base64')

    return {
      signature,
      method: 'PKI_LOCAL',
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('PKI_LOCAL signing failed:', error)
    throw error
  }
}

/**
 * Verify signature using public certificate
 * Returns validation result
 */
export function verifyWithPKILocal(
  data: string,
  signature: string,
  publicCertPath: string = 'public/certs/clinic-cert.pem'
): VerificationResult {
  try {
    const fullPath = path.resolve(publicCertPath)
    
    if (!fs.existsSync(fullPath)) {
      return {
        valid: false,
        method: 'PKI_LOCAL',
        message: `Public certificate not found at ${fullPath}`,
      }
    }

    const publicCert = fs.readFileSync(fullPath, 'utf-8')
    const verify = crypto.createVerify('sha256')
    verify.update(data)
    const valid = verify.verify(publicCert, signature, 'base64')

    return {
      valid,
      method: 'PKI_LOCAL',
      message: valid ? 'Signature verified' : 'Signature invalid',
    }
  } catch (error) {
    console.error('PKI_LOCAL verification failed:', error)
    return {
      valid: false,
      method: 'PKI_LOCAL',
      message: error instanceof Error ? error.message : 'Verification failed',
    }
  }
}

// ============================================
// ICP-BRASIL: Hooks for official certificates
// ============================================

/**
 * Hook for future ICP-Brasil signing
 * Placeholder - implement when hardware/SDK is available
 * 
 * Options:
 * 1. Hardware token (A3) via PKCS#11 API
 * 2. Software certificate (A1) via Java SignerLib or similar
 * 3. Cloud signing service integration
 */
export function signWithICPBrasil(
  data: string,
  certificatePath?: string,
  password?: string
): SignatureResult {
  throw new Error(
    'ICP-Brasil signing not yet implemented. ' +
    'Requires: certificate hardware/software, PKCS#11 driver, or cloud signing API. ' +
    'Using PKI_LOCAL for now.'
  )
}

/**
 * Hook for future ICP-Brasil verification
 * Validates against official ICP-Brasil certificate chain
 */
export function verifyWithICPBrasil(
  data: string,
  signature: string,
  certificatePath?: string
): VerificationResult {
  return {
    valid: false,
    method: 'ICP_BRASIL',
    message: 'ICP-Brasil verification not yet implemented',
  }
}

// ============================================
// Main API: Unified interface
// ============================================

/**
 * Sign certificate with specified method
 */
export function signCertificate(
  data: string,
  method: SignatureMethod = 'PKI_LOCAL',
  options?: {
    privateKeyPath?: string
    certificatePath?: string
    password?: string
  }
): SignatureResult {
  switch (method) {
    case 'PKI_LOCAL':
      return signWithPKILocal(data, options?.privateKeyPath)
    case 'ICP_BRASIL':
      return signWithICPBrasil(data, options?.certificatePath, options?.password)
    case 'NONE':
      return {
        signature: '',
        method: 'NONE',
        timestamp: new Date(),
      }
    default:
      throw new Error(`Unknown signature method: ${method}`)
  }
}

/**
 * Verify certificate signature
 */
export function verifyCertificate(
  data: string,
  signature: string,
  method: SignatureMethod = 'PKI_LOCAL',
  options?: {
    publicCertPath?: string
  }
): VerificationResult {
  switch (method) {
    case 'PKI_LOCAL':
      return verifyWithPKILocal(data, signature, options?.publicCertPath)
    case 'ICP_BRASIL':
      return verifyWithICPBrasil(data, signature, options?.publicCertPath)
    case 'NONE':
      return {
        valid: true,
        method: 'NONE',
        message: 'No signature verification (unsigned)',
      }
    default:
      return {
        valid: false,
        method: 'NONE' as SignatureMethod,
        message: `Unknown signature method: ${method}`,
      }
  }
}

/**
 * Get certificate public key info (for display)
 */
export function getCertificateInfo(
  publicCertPath: string = 'public/certs/clinic-cert.pem'
) {
  try {
    const fullPath = path.resolve(publicCertPath)
    if (!fs.existsSync(fullPath)) {
      return null
    }

    const cert = fs.readFileSync(fullPath, 'utf-8')
    
    // Parse X.509 certificate (simplified - just return exists)
    // For detailed parsing, use 'x509' or 'cert-info' library
    return {
      exists: true,
      path: publicCertPath,
      type: 'X.509 Self-Signed',
      algorithm: 'RSA 2048',
      // More fields would require parsing library
    }
  } catch (error) {
    return null
  }
}
