export function AuditGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Audit and Quality Guide</h1>
      <p>Auditorias, planos de qualidade e relatórios finais. Este sistema adota o princípio de só afirmar o que é comprovado em runtime ou por configuração validada.</p>
      <h2 className="mt-6 text-xl font-semibold">Ajustes de Verdade e Transparência</h2>
      <ul className="list-disc ml-6">
        <li>Remoção de dados simulados, métricas inventadas e afirmações absolutas (“100%”, “garantido”, “production-ready”, etc.)</li>
        <li>Quando algo não é mensurável pelo código, o sistema retorna <code>null</code> ou “Não disponível”</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Principais Correções</h2>
      <ul className="list-disc ml-6">
        <li>Backups: scripts e docs revisados para não prometer garantias absolutas</li>
        <li>Assinatura/A1: documentação sem promessas de validade legal/ICP-Brasil quando não implementado</li>
        <li>Dashboard admin: métricas sem base são <code>null</code> na UI</li>
        <li>Relatórios e docs históricos marcados como referência, não como garantia operacional</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Como validar</h2>
      <ul className="list-disc ml-6">
        <li>Backups: usar Settings → Backups e confirmar arquivos em <code>BACKUPS_DIR</code> e restore em ambiente separado</li>
        <li>Assinaturas: validar apenas o que está implementado e documentado</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Relatórios Finais e Técnicos</h2>
      <ul className="list-disc ml-6">
        <li>FINAL_COMPLETION_REPORT.md</li>
        <li>MEDICAL_CERTIFICATE_COMPLETE_REPORT.md</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Histórico</h2>
      <ul className="list-disc ml-6">
        <li>Relatórios antigos e “completion” são mantidos apenas como histórico, não como status atual</li>
      </ul>
    </main>
  );
}
