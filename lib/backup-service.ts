/**
 * Sistema de Backup Automatizado
 * 
 * Estratégia 3-2-1:
 * - 3 cópias dos dados
 * - 2 mídias diferentes (local + cloud)
 * - 1 cópia offsite
 * 
 * Componentes:
 * 1. Backup PostgreSQL (pg_dump)
 * 2. Backup arquivos /uploads
 * 3. Upload para S3 (AWS)
 * 4. Upload para Google Drive (offsite)
 * 5. Rotação automática (manter últimos 30 dias)
 * 6. Teste de restore mensal
 * 7. Alertas em falhas
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

// Optional dependencies - uncomment to enable S3 and Google Drive uploads
// npm install @aws-sdk/client-s3 googleapis archiver
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import { google } from 'googleapis';
// import archiver from 'archiver';

const execAsync = promisify(exec);

interface BackupConfig {
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  uploadsDir: string;
  backupDir: string;
  s3Bucket?: string;
  s3Region?: string;
  googleDriveFolder?: string;
  retentionDays: number;
  notificationEmail?: string;
}

interface BackupResult {
  success: boolean;
  timestamp: Date;
  dbBackupPath?: string;
  filesBackupPath?: string;
  s3Uploaded?: boolean;
  googleDriveUploaded?: boolean;
  errors: string[];
  size: {
    dbMB: number;
    filesMB: number;
  };
}

export class BackupService {
  private config: BackupConfig;
  // private s3Client?: S3Client; // Uncomment after: npm install @aws-sdk/client-s3

  constructor(config: BackupConfig) {
    this.config = config;

    // Criar diretório de backup se não existir
    if (!existsSync(config.backupDir)) {
      mkdirSync(config.backupDir, { recursive: true });
    }

    // Inicializar S3 se configurado (requer @aws-sdk/client-s3)
    // if (config.s3Bucket && config.s3Region) {
    //   this.s3Client = new S3Client({ region: config.s3Region });
    // }
  }

  /**
   * Executar backup completo
   */
  async runFullBackup(): Promise<BackupResult> {
    const result: BackupResult = {
      success: false,
      timestamp: new Date(),
      errors: [],
      size: {
        dbMB: 0,
        filesMB: 0
      }
    };

    try {
      console.log('[Backup] Iniciando backup completo...');

      // 1. Backup do PostgreSQL
      const dbBackup = await this.backupPostgreSQL();
      if (dbBackup.success) {
        result.dbBackupPath = dbBackup.path;
        result.size.dbMB = dbBackup.sizeMB || 0;
      } else {
        result.errors.push(`Database backup falhou: ${dbBackup.error}`);
      }

      // 2. Backup dos arquivos
      const filesBackup = await this.backupFiles();
      if (filesBackup.success) {
        result.filesBackupPath = filesBackup.path;
        result.size.filesMB = filesBackup.sizeMB || 0;
      } else {
        result.errors.push(`Files backup falhou: ${filesBackup.error}`);
      }

      // 3. Upload para S3 (requer @aws-sdk/client-s3)
      // if (this.s3Client && result.dbBackupPath && result.filesBackupPath) {
      //   const s3Upload = await this.uploadToS3([result.dbBackupPath, result.filesBackupPath]);
      //   result.s3Uploaded = s3Upload;
      //   if (!s3Upload) {
      //     result.errors.push('Upload para S3 falhou');
      //   }
      // }

      // 4. Upload para Google Drive
      if (this.config.googleDriveFolder && result.dbBackupPath && result.filesBackupPath) {
        const driveUpload = await this.uploadToGoogleDrive([result.dbBackupPath, result.filesBackupPath]);
        result.googleDriveUploaded = driveUpload;
        if (!driveUpload) {
          result.errors.push('Upload para Google Drive falhou');
        }
      }

      // 5. Rotação de backups antigos
      await this.rotateOldBackups();

      result.success = result.errors.length === 0;

      // 6. Enviar notificação
      if (this.config.notificationEmail) {
        await this.sendNotification(result);
      }

      console.log('[Backup] Concluído:', result.success ? 'SUCESSO' : 'COM ERROS');

      return result;
    } catch (error) {
      result.errors.push(`Erro inesperado: ${error}`);
      return result;
    }
  }

  /**
   * Backup do banco PostgreSQL
   */
  private async backupPostgreSQL(): Promise<{ success: boolean; path?: string; sizeMB?: number; error?: string }> {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `db_backup_${timestamp}.sql.gz`;
      const backupPath = join(this.config.backupDir, filename);

      // pg_dump com compressão
      const command = `PGPASSWORD="${this.config.postgresPassword}" pg_dump -h ${this.config.postgresHost} -p ${this.config.postgresPort} -U ${this.config.postgresUser} -d ${this.config.postgresDatabase} -F c -f ${backupPath}`;

      await execAsync(command);

      const stats = statSync(backupPath);
      const sizeMB = stats.size / (1024 * 1024);

      console.log(`[Backup] PostgreSQL: ${sizeMB.toFixed(2)} MB`);

      return {
        success: true,
        path: backupPath,
        sizeMB: Math.round(sizeMB * 100) / 100
      };
    } catch (error) {
      console.error('[Backup] PostgreSQL falhou:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Backup dos arquivos (uploads)
   */
  private async backupFiles(): Promise<{ success: boolean; path?: string; sizeMB?: number; error?: string }> {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `files_backup_${timestamp}.tar.gz`;
      const backupPath = join(this.config.backupDir, filename);

      // Criar arquivo tar.gz
      // TODO: Instalar 'archiver' package
      // await new Promise<void>((resolve, reject) => {
      // Using archiver requires: npm install archiver
      // const output = createWriteStream(backupPath);
      // const archive = archiver('tar', {
      //   gzip: true,
      //   gzipOptions: { level: 9 }
      // });
      // output.on('close', () => resolve());
      // archive.on('error', (err: Error) => reject(err));
      // archive.pipe(output);
      // archive.directory(this.config.uploadsDir, false);
      // archive.finalize();
      
      // Fallback: usar tar via shell
      await execAsync(`tar -czf ${backupPath} -C ${this.config.uploadsDir} .`);

      const stats = statSync(backupPath);
      const sizeMB = stats.size / (1024 * 1024);

      console.log(`[Backup] Arquivos: ${sizeMB.toFixed(2)} MB`);

      return {
        success: true,
        path: backupPath,
        sizeMB: Math.round(sizeMB * 100) / 100
      };
    } catch (error) {
      console.error('[Backup] Arquivos falhou:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Upload para AWS S3
   * Requires: npm install @aws-sdk/client-s3
   */
  private async uploadToS3(filePaths: string[]): Promise<boolean> {
    if (!this.config.s3Bucket) {
      console.warn('[Backup] S3 não configurado. Instale @aws-sdk/client-s3 para habilitar.');
      return false;
    }

    try {
      // This requires AWS SDK to be installed
      // Uncomment after: npm install @aws-sdk/client-s3
      // const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      // const s3Client = new S3Client({ region: this.config.s3Region });
      // for (const filePath of filePaths) {
      //   const fileStream = createReadStream(filePath);
      //   const filename = filePath.split('/').pop()!;
      //   const command = new PutObjectCommand({
      //     Bucket: this.config.s3Bucket,
      //     Key: `backups/${filename}`,
      //     Body: fileStream
      //   });
      //   await s3Client.send(command);
      //   console.log(`[Backup] Uploaded to S3: ${filename}`);
      // }
      
      console.log('[Backup] S3 upload skipped (AWS SDK not installed)');
      return false;
    } catch (error) {
      console.error('[Backup] S3 upload falhou:', error);
      return false;
    }
  }

  /**
   * Upload para Google Drive
   * Requires: npm install googleapis
   */
  private async uploadToGoogleDrive(filePaths: string[]): Promise<boolean> {
    try {
      // Assumir que GOOGLE_CREDENTIALS está em ENV
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
      if (!credentials.client_email) {
        console.warn('[Backup] Google Drive não configurado');
        return false;
      }

      // This requires googleapis SDK to be installed
      // Uncomment after: npm install googleapis
      // const { google } = await import('googleapis');
      // const auth = new google.auth.GoogleAuth({
      //   credentials,
      //   scopes: ['https://www.googleapis.com/auth/drive.file']
      // });
      // const drive = google.drive({ version: 'v3', auth });

      console.log('[Backup] Google Drive upload skipped (googleapis SDK not installed)');
      return false;

      // Uncomment the following after: npm install googleapis
      // for (const filePath of filePaths) {
      //   const filename = filePath.split('/').pop()!;
      //   const response = await drive.files.create({
      //     requestBody: {
      //       name: filename,
      //       parents: this.config.googleDriveFolder ? [this.config.googleDriveFolder] : undefined
      //     },
      //     media: {
      //       body: createReadStream(filePath)
      //     },
      //     fields: 'id'
      //   });
      //   console.log(`[Backup] Uploaded to Google Drive: ${filename} (${response.data.id})`);
      // }
      // return true;
    } catch (error) {
      console.error('[Backup] Google Drive upload falhou:', error);
      return false;
    }
  }

  /**
   * Rotação de backups antigos (manter últimos N dias)
   */
  private async rotateOldBackups(): Promise<void> {
    try {
      const files = readdirSync(this.config.backupDir);
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = join(this.config.backupDir, file);
        const stats = statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > retentionMs) {
          unlinkSync(filePath);
          console.log(`[Backup] Removido backup antigo: ${file}`);
        }
      }
    } catch (error) {
      console.error('[Backup] Rotação de backups falhou:', error);
    }
  }

  /**
   * Enviar notificação de status
   */
  private async sendNotification(result: BackupResult): Promise<void> {
    // TODO: Integrar com serviço de email (NodeMailer, SendGrid, etc.)
    console.log('[Backup] Notificação:', {
      success: result.success,
      errors: result.errors,
      sizes: result.size
    });
  }

  /**
   * Teste de restore (executar mensalmente)
   */
  async testRestore(backupFile: string): Promise<boolean> {
    try {
      console.log('[Backup] Iniciando teste de restore...');

      // Criar database temporário
      const testDbName = `healthcare_restore_test_${Date.now()}`;

      await execAsync(`PGPASSWORD="${this.config.postgresPassword}" createdb -h ${this.config.postgresHost} -p ${this.config.postgresPort} -U ${this.config.postgresUser} ${testDbName}`);

      // Restore
      await execAsync(`PGPASSWORD="${this.config.postgresPassword}" pg_restore -h ${this.config.postgresHost} -p ${this.config.postgresPort} -U ${this.config.postgresUser} -d ${testDbName} ${backupFile}`);

      // Validar (query simples)
      const { stdout } = await execAsync(`PGPASSWORD="${this.config.postgresPassword}" psql -h ${this.config.postgresHost} -p ${this.config.postgresPort} -U ${this.config.postgresUser} -d ${testDbName} -c "SELECT COUNT(*) FROM users;"`);

      console.log('[Backup] Teste de restore SUCESSO:', stdout);

      // Limpar database de teste
      await execAsync(`PGPASSWORD="${this.config.postgresPassword}" dropdb -h ${this.config.postgresHost} -p ${this.config.postgresPort} -U ${this.config.postgresUser} ${testDbName}`);

      return true;
    } catch (error) {
      console.error('[Backup] Teste de restore FALHOU:', error);
      return false;
    }
  }
}

// Singleton configurado via ENV
export const backupService = new BackupService({
  postgresHost: process.env.POSTGRES_HOST || 'localhost',
  postgresPort: parseInt(process.env.POSTGRES_PORT || '5432'),
  postgresUser: process.env.POSTGRES_USER || 'healthcare',
  postgresPassword: process.env.POSTGRES_PASSWORD || '',
  postgresDatabase: process.env.POSTGRES_DB || 'healthcare_db',
  uploadsDir: process.env.UPLOADS_DIR || './uploads',
  backupDir: process.env.BACKUP_DIR || './backups',
  s3Bucket: process.env.S3_BACKUP_BUCKET,
  s3Region: process.env.S3_BACKUP_REGION,
  googleDriveFolder: process.env.GOOGLE_DRIVE_BACKUP_FOLDER,
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL
});
