export function ImplementationGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Implementation Guide</h1>
      <p>Padrões, checklist e roadmap para implementação do sistema HealthCare.</p>
      <h2 className="mt-6 text-xl font-semibold">Checklist de Features</h2>
      <ul className="list-disc ml-6">
        <li>QR Code System: geração, exportação, validação pública</li>
        <li>Email Notifications: SMTP, templates, integração com emissão/revogação</li>
        <li>Digital Signatures: PKI-Local, armazenamento, verificação, ICP-Brasil (futuro)</li>
        <li>Cartório/SUS/Gov: APIs de integração (ver detalhes em relatórios técnicos)</li>
        <li>Backup System: scripts, restore, automação</li>
        <li>Audit Trail: logging completo de operações</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Observações</h2>
      <ul className="list-disc ml-6">
        <li>Este checklist é referência de desenvolvimento, não garantia operacional/compliance</li>
        <li>Para status detalhado, consulte os relatórios finais e auditoria</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Roadmap e Padrões</h2>
      <ul className="list-disc ml-6">
        <li>Verifique IMPLEMENTATION_ROADMAP.md para histórico</li>
        <li>Padrões de UX: React Hook Form, zod, shadcn/Radix, Tailwind</li>
        <li>RBAC via NextAuth, proteção de dados sensíveis</li>
      </ul>
    </main>
  );
}
