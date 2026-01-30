export function BackupGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Backup Guide</h1>
      <p>Este documento descreve o que está implementado no sistema para backup e restore, sem promessas de “100%”, “garantido” ou “risco 0%”.</p>
      <h2 className="mt-6 text-xl font-semibold">O que existe (implementado)</h2>
      <ul className="list-disc ml-6">
        <li>Backup do banco de dados PostgreSQL via <code>pg_dump</code> + <code>gzip</code></li>
        <li>Script principal: <code>scripts/backup-complete.sh</code></li>
        <li>Diretório de saída: <code>BACKUPS_DIR</code> (ex: <code>/app/backups</code> em produção)</li>
        <li>Arquivos gerados: <code>healthcare_&lt;timestamp&gt;.sql.gz</code>, <code>manifest_&lt;timestamp&gt;.json</code>, <code>status_&lt;timestamp&gt;.json</code></li>
        <li>Backup de configurações/arquivos: best-effort, depende do ambiente e paths existentes</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Limitações e Recomendações</h2>
      <ul className="list-disc ml-6">
        <li>Agendamento automático depende de systemd/cron configurado</li>
        <li>Arquivos em <code>uploads/</code> só são protegidos se incluídos na estratégia de backup</li>
        <li>Restore deve ser testado e validado no seu ambiente</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Restore</h2>
      <ul className="list-disc ml-6">
        <li>Script: <code>scripts/restore-database.sh</code></li>
        <li>Restaura a partir de um arquivo <code>healthcare_&lt;timestamp&gt;.sql.gz</code></li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Como usar</h2>
      <ul className="list-disc ml-6">
        <li>UI/Admin: Settings → Backups</li>
        <li>API: <code>POST /api/admin/backups</code> (criar), <code>POST /api/admin/backups/restore</code> (restaurar)</li>
      </ul>
    </main>
  );
}
