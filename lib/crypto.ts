/**
 * Re-exporta funções de criptografia da aplicação.
 * A implementação fica em ./encryption para evitar conflito de resolução
 * com o módulo nativo Node.js "crypto" durante o bundle (Next.js/Webpack).
 */
export {
  encrypt,
  decrypt,
  hashCPF,
  encryptField,
  decryptField,
  getEncryptionVersion,
  needsKeyRotation,
  rotateEncryption,
  generateKeyHash,
  listKeyVersions,
  encryptJSON,
  decryptJSON,
} from './encryption'
