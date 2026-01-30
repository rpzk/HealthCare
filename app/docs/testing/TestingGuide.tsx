export function TestingGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Testing Guide</h1>
      <p>Guia de testes automatizados e manuais para o sistema HealthCare.</p>
      <h2 className="mt-6 text-xl font-semibold">Testes Automatizados</h2>
      <ul className="list-disc ml-6">
        <li>Scripts em tests/ e test-ai.sh</li>
        <li>Cobertura de endpoints principais</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Testes com Dados Reais</h2>
      <ul className="list-disc ml-6">
        <li>Validação com pacientes reais</li>
        <li>Arquivos .csv para importação</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Smoke/E2E/Unitários</h2>
      <ul className="list-disc ml-6">
        <li>Testes descritos em docs/TESTING_GUIDE.md</li>
        <li>Testes unitários em QUESTIONNAIRE_START_HERE.md</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Troubleshooting</h2>
      <ul className="list-disc ml-6">
        <li>Consulte logs de testes</li>
        <li>Verifique scripts de validação</li>
      </ul>
    </main>
  );
}
