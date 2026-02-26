'use client'

export function Slide4Custos() {
  return (
    <section className="min-h-screen flex flex-col px-12 py-16 bg-slate-900 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-4 border-b border-slate-600 pb-4">
        Estimativa de Custos de Nuvem (Direto com a Microsoft)
      </h2>
      <p className="text-lg font-medium text-slate-300 mb-2">Previsibilidade Operacional (OPEX)</p>
      <p className="text-slate-400 mb-10 max-w-2xl">
        Estimativa de consumo mensal na nuvem Azure para a volumetria de um ambulatório
        corporativo (uso moderado/alto).
      </p>
      <div className="space-y-6 max-w-xl">
        <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-6 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white">Computação</h3>
            <p className="text-sm text-slate-400">
              App Service ou VM D2s_v3 (8GB RAM)
            </p>
          </div>
          <span className="text-2xl font-bold text-emerald-400">~ R$ 600,00 / mês</span>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-800/50 p-6 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-white">Banco de Dados</h3>
            <p className="text-sm text-slate-400">
              Postgres Flexible Server (8GB RAM) + Storage de PDFs
            </p>
          </div>
          <span className="text-2xl font-bold text-emerald-400">~ R$ 400,00 / mês</span>
        </div>
      </div>
      <div className="mt-10 p-6 rounded-xl bg-emerald-950/40 border-2 border-emerald-600/50">
        <p className="text-xl font-bold text-white">
          Total Estimado Infraestrutura: ~ R$ 1.000,00 / mês
        </p>
        <p className="text-slate-400 mt-2">
          Faturado diretamente pela Microsoft no Tenant da Propay.
        </p>
      </div>
    </section>
  )
}
