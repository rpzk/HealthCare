'use client'

export function Slide3Arquitetura() {
  return (
    <section className="min-h-screen flex flex-col px-12 py-16 bg-slate-900 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-4 border-b border-slate-600 pb-4">
        Arquitetura Cloud-Native (Seu Dado, Sua Nuvem)
      </h2>
      <p className="text-slate-300 mb-10 max-w-3xl">
        O sistema foi desenhado para rodar dentro do ecossistema do cliente. Os dados de saúde
        nunca saem do controle e da assinatura Azure da Propay.
      </p>
      <p className="text-lg font-medium text-slate-200 mb-8">
        Arquitetura de Implantação (Microsoft Azure)
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-6 hover:border-blue-500/50 transition-colors">
          <div className="text-2xl font-bold text-blue-400 mb-3">1.</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Conteinerização (Docker)
          </h3>
          <p className="text-slate-400 text-sm">
            Aplicação encapsulada, garantindo que rode de forma idêntica em qualquer ambiente
            Azure.
          </p>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-6 hover:border-blue-500/50 transition-colors">
          <div className="text-2xl font-bold text-blue-400 mb-3">2.</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Aplicação (App Service)
          </h3>
          <p className="text-slate-400 text-sm">
            Frontend e Backend unificados em Next.js/Node.js, escaláveis sob demanda.
          </p>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-6 hover:border-blue-500/50 transition-colors">
          <div className="text-2xl font-bold text-blue-400 mb-3">3.</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Banco de Dados
          </h3>
          <p className="text-slate-400 text-sm">
            PostgreSQL gerenciado, com backups automatizados e criptografia em repouso
            (AES-256).
          </p>
        </div>
      </div>
    </section>
  )
}
