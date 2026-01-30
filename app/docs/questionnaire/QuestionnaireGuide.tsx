export function QuestionnaireGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Questionnaire Guide</h1>
      <p>Guia sobre arquitetura, integração, analytics, UI e testes de questionários.</p>
      <h2 className="mt-6 text-xl font-semibold">Resumo da Entrega</h2>
      <ul className="list-disc ml-6">
        <li>Dashboard intuitivo com análise em tempo real, notificações automáticas e insights de IA</li>
        <li>APIs e componentes React para analytics, notificações, insights e alertas</li>
        <li>Design responsivo e integração com templates</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Documentação e Arquitetura</h2>
      <ul className="list-disc ml-6">
        <li>Guia de solução, guia de usuário, design visual e UX</li>
        <li>Setup rápido, integração, detalhes técnicos, inventário de arquivos</li>
        <li>Relatório de entrega e schema de banco de dados</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Testes e Validação</h2>
      <ul className="list-disc ml-6">
        <li>Validação operacional depende do ambiente/configuração</li>
        <li>Recomenda-se validar dashboard e integrações em ambiente real</li>
      </ul>
    </main>
  );
}
