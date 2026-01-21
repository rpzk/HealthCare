/**
 * Storage Service - Gerenciamento de uploads de arquivos
 * 
 * Suporta:
 * - AWS S3
 * - MinIO (S3-compatible)
 * - File System local (desenvolvimento)
 * 
 * Features:
 * - Upload de vídeos de consultas
 * - Criptografia AES-256
 * - Geração de URLs assinadas
 * - Limpeza automática de arquivos antigos
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { SystemSettingsService } from './system-settings-service';
import { logger } from '@/lib/logger'

// Configuração com fallback para .env
const ENCRYPTION_KEY = process.env.RECORDING_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex');

// Cache de configuração e cliente S3
let cachedConfig: any = null;
let s3Client: S3Client | null = null;

/**
 * Obtém configuração de storage (DB com fallback para .env)
 */
async function getStorageConfig() {
  if (cachedConfig) return cachedConfig;
  
  cachedConfig = await SystemSettingsService.getStorageConfig();
  
  // Inicializar cliente S3 se necessário
  if ((cachedConfig.type === 's3' || cachedConfig.type === 'minio') && !s3Client) {
    s3Client = new S3Client({
      region: cachedConfig.region,
      endpoint: cachedConfig.endpoint,
      credentials: {
        accessKeyId: cachedConfig.accessKey || '',
        secretAccessKey: cachedConfig.secretKey || '',
      },
      forcePathStyle: cachedConfig.type === 'minio',
    });
  }
  
  return cachedConfig;
}

export interface UploadOptions {
  filename: string;
  contentType: string;
  metadata?: Record<string, string>;
  encrypt?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  encrypted: boolean;
}

/**
 * Criptografa dados usando AES-256-CBC
 */
function encryptData(data: Buffer): { encrypted: Buffer; iv: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );
  
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  
  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * Descriptografa dados usando AES-256-CBC
 */
function decryptData(encrypted: Buffer, iv: string): Buffer {
  const decipher = createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Upload de arquivo para storage
 */
export async function uploadRecording(
  data: Buffer,
  options: UploadOptions
): Promise<UploadResult> {
  const { filename, contentType, metadata = {}, encrypt = true } = options;
  
  let finalData = data;
  let iv: string | undefined;
  
  // Criptografar se solicitado
  if (encrypt) {
    const encrypted = encryptData(data);
    finalData = encrypted.encrypted;
    iv = encrypted.iv;
  }
  
  const key = `recordings/${new Date().toISOString().split('T')[0]}/${filename}`;
  
  // Obter configuração
  const config = await getStorageConfig();
  
  // Storage local (desenvolvimento)
  if (config.type === 'local') {
    const filePath = path.join(config.localPath, key);
    const dir = path.dirname(filePath);
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    await writeFile(filePath, finalData);
    
    // Salvar IV em arquivo separado se criptografado
    if (iv) {
      await writeFile(`${filePath}.iv`, iv);
    }
    
    return {
      url: `/storage/${key}`,
      key,
      size: finalData.length,
      encrypted: encrypt,
    };
  }
  
  // S3 / MinIO
  if (s3Client) {
    const uploadMetadata: Record<string, string> = {
      ...metadata,
      encrypted: encrypt.toString(),
    };
    
    if (iv) {
      uploadMetadata.iv = iv.toString();
    }
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: finalData,
        ContentType: contentType,
        Metadata: uploadMetadata,
      })
    );
    
    return {
      url: config.endpoint 
        ? `${config.endpoint}/${config.bucket}/${key}`
        : `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`,
      key,
      size: finalData.length,
      encrypted: encrypt,
    };
  }
  
  throw new Error('Storage não configurado');
}

/**
 * Gera URL assinada para acesso temporário (válida por 1 hora)
 */
export async function getSignedRecordingUrl(key: string): Promise<string> {
  const config = await getStorageConfig();
  
  if (config.type === 'local') {
    return `/api/storage/download?key=${encodeURIComponent(key)}`;
  }
  
  if (s3Client) {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }
  
  throw new Error('Storage não configurado');
}

/**
 * Download e descriptografia de gravação
 */
export async function downloadRecording(key: string): Promise<Buffer> {
  const config = await getStorageConfig();
  
  if (config.type === 'local') {
    const filePath = path.join(config.localPath, key);
    const fs = await import('fs/promises');
    let data: Buffer = await fs.readFile(filePath);
    
    // Verificar se está criptografado
    const ivPath = `${filePath}.iv`;
    if (existsSync(ivPath)) {
      const iv = await fs.readFile(ivPath, 'utf-8');
      data = decryptData(data, iv.trim());
    }
    
    return data;
  }
  
  if (s3Client) {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    
    let data: Buffer = Buffer.concat(chunks) as Buffer;
    
    // Descriptografar se necessário
    if (response.Metadata?.encrypted === 'true' && response.Metadata?.iv) {
      data = decryptData(data, response.Metadata.iv);
    }
    
    return data;
  }
  
  throw new Error('Storage não configurado');
}

/**
 * Deleta gravação
 */
export async function deleteRecording(key: string): Promise<void> {
  const config = await getStorageConfig();
  
  if (config.type === 'local') {
    const filePath = path.join(config.localPath, key);
    await unlink(filePath).catch(() => {});
    await unlink(`${filePath}.iv`).catch(() => {});
    return;
  }
  
  if (s3Client) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return;
  }
  
  throw new Error('Storage não configurado');
}

/**
 * Limpa gravações antigas (útil para desenvolvimento)
 */
export async function cleanupOldRecordings(daysOld: number = 90): Promise<number> {
  // TODO: Implementar limpeza automática
  // - Listar arquivos mais antigos que X dias
  // - Deletar em batch
  // - Retornar número de arquivos deletados
  
  logger.info(`Cleanup de gravações com mais de ${daysOld} dias não implementado ainda`);
  return 0;
}

/**
 * Obtém tamanho total usado no storage
 */
export async function getStorageUsage(): Promise<{ files: number; sizeBytes: number }> {
  // TODO: Implementar cálculo de uso
  return { files: 0, sizeBytes: 0 };
}

export const StorageService = {
  uploadRecording,
  getSignedRecordingUrl,
  downloadRecording,
  deleteRecording,
  cleanupOldRecordings,
  getStorageUsage,
};
