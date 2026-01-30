export function TermsGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Terms and Compliance Guide</h1>
      <p>Documentação sobre termos, enforcement, sanitização e LGPD.</p>
      <h2 className="mt-6 text-xl font-semibold">Termos de Uso</h2>
      <ul className="list-disc ml-6">
        <li>Consulte TERMS_ENFORCEMENT_GUIDE.md para regras</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Enforcement</h2>
      <ul className="list-disc ml-6">
        <li>Implementação de validação e bloqueio</li>
        <li>Auditoria de conformidade</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Sanitização</h2>
      <ul className="list-disc ml-6">
        <li>Plano em SANITIZATION_PLAN_EXECUTIVE.md</li>
        <li>Remoção de dados simulados</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">LGPD</h2>
      <ul className="list-disc ml-6">
        <li>Proteção de dados sensíveis</li>
        <li>Relatórios de conformidade</li>
      </ul>
    </main>
  );
}
