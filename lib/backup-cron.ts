/**
 * Cron Job: Backup Diário Automatizado
 * 
 * Executar via:
 * - Node cron (node-cron) - npm install node-cron
 * - Sistema cron (crontab) - recomendado para produção
 * - Kubernetes CronJob
 * 
 * Agenda: Todo dia às 3h da manhã (America/Sao_Paulo)
 * 
 * Crontab setup:
 * crontab -e
 * 0 3 * * * cd /path/to/healthcare && node lib/backup-cron.js >> logs/backup.log 2>&1
 */

import { backupService } from '@/lib/backup-service';

/**
 * Função para executar backup (exportada para uso via API ou cron)
 */
export async function executeBackup() {
  console.log('[Backup Cron] Iniciando backup diário agendado...');
  
  try {
    const result = await backupService.runFullBackup();
    
    if (result.success) {
      console.log('[Backup Cron] ✓ Backup SUCESSO:', {
        timestamp: result.timestamp,
        dbMB: result.size.dbMB,
        filesMB: result.size.filesMB,
        s3Uploaded: result.s3Uploaded,
        googleDriveUploaded: result.googleDriveUploaded
      });
    } else {
      console.error('[Backup Cron] ✗ Backup FALHOU:', result.errors);
      // TODO: Alertar via email/Slack
    }
  } catch (error) {
    console.error('[Backup Cron] Erro crítico no backup:', error);
    process.exit(1);
  }
}

/**
 * Função para executar teste de restore (exportada para uso via API ou cron)
 */
export async function executeRestoreTest() {
  console.log('[Backup Cron] Iniciando teste de restore...');
  
  try {
    // Buscar backup mais recente
    const backupDir = process.env.BACKUP_DIR || './backups';
    const fs = await import('fs/promises');
    
    const files = await fs.readdir(backupDir);
    const dbBackups = files
      .filter((f: string) => f.startsWith('db_backup_'))
      .sort()
      .reverse();
    
    if (dbBackups.length > 0) {
      const latestBackup = `${backupDir}/${dbBackups[0]}`;
      const testResult = await backupService.testRestore(latestBackup);
      
      if (testResult) {
        console.log('[Backup Cron] ✓ Teste de restore SUCESSO');
      } else {
        console.error('[Backup Cron] ✗ Teste de restore FALHOU - ATENÇÃO!');
        // TODO: Alertar imediatamente
      }
    } else {
      console.warn('[Backup Cron] Nenhum backup encontrado para teste');
    }
  } catch (error) {
    console.error('[Backup Cron] Erro no teste de restore:', error);
    process.exit(1);
  }
}

/**
 * Scheduler com node-cron (opcional)
 * npm install node-cron
 */
export function scheduleBackupsWithCron() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cron = require('node-cron');
    
    // Backup diário às 3h AM
    cron.schedule('0 3 * * *', executeBackup, {
      timezone: 'America/Sao_Paulo'
    });

    // Teste de restore: primeiro domingo do mês às 2h AM
    cron.schedule('0 2 * * 0', async () => {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      if (dayOfMonth <= 7) {
        await executeRestoreTest();
      }
    }, {
      timezone: 'America/Sao_Paulo'
    });

    console.log('[Backup Cron] ✓ Scheduler inicializado:');
    console.log('  - Backup diário: 3h AM (America/Sao_Paulo)');
    console.log('  - Teste restore: Primeiro domingo do mês, 2h AM');
  } catch (error) {
    console.warn('[Backup Cron] node-cron não disponível. Use crontab para agendamento.');
  }
}
