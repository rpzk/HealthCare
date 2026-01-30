export function DeployGuide() {
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Deploy Guide</h1>
      <p>Guia para deploy do sistema HealthCare em produção e desenvolvimento.</p>
      <h2 className="mt-6 text-xl font-semibold">Passos para Deploy</h2>
      <ul className="list-disc ml-6">
        <li>Build: npm run build</li>
        <li>Produção: docker compose -f docker-compose.prod.yml up -d --build</li>
        <li>Desenvolvimento: docker compose up -d postgres redis</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Variáveis de Ambiente</h2>
      <ul className="list-disc ml-6">
        <li>Consulte .env.example para configuração</li>
        <li>Configure SMTP, DATABASE_URL, REDIS_HOST, OLLAMA_URL/MODEL</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Checklist de Produção</h2>
      <ul className="list-disc ml-6">
        <li>Executar scripts de backup</li>
        <li>Validar configurações de segurança</li>
        <li>Testar endpoints principais</li>
      </ul>
      <h2 className="mt-6 text-xl font-semibold">Troubleshooting</h2>
      <ul className="list-disc ml-6">
        <li>Verifique logs do Docker</li>
        <li>Consulte README.md para dúvidas comuns</li>
      </ul>
    </main>
  );
}
