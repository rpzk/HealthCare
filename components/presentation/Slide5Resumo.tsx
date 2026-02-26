'use client'

export function Slide5Resumo() {
  return (
    <section className="min-h-screen flex flex-col px-12 py-16 bg-slate-900 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-10 border-b border-slate-600 pb-4">
        Por que evoluir para o HealthCare?
      </h2>
      <p className="text-slate-400 mb-8">Resumo Executivo (ROI e Mitigação de Risco)</p>
      <ul className="space-y-6 max-w-3xl">
        <li className="flex gap-4 rounded-xl border border-slate-600 bg-slate-800/50 p-6">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center font-bold text-white">
            1
          </span>
          <div>
            <h3 className="font-semibold text-white mb-1">Eliminação de Passivo</h3>
            <p className="text-slate-400">
              O custo de uma infração LGPD (ANPD) ou auditoria do CFM é infinitamente superior ao
              investimento em software adequado.
            </p>
          </div>
        </li>
        <li className="flex gap-4 rounded-xl border border-slate-600 bg-slate-800/50 p-6">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center font-bold text-white">
            2
          </span>
          <div>
            <h3 className="font-semibold text-white mb-1">Retenção do Dado</h3>
            <p className="text-slate-400">
              A Propay mantém a soberania dos dados médicos de seus colaboradores em sua própria
              nuvem.
            </p>
          </div>
        </li>
        <li className="flex gap-4 rounded-xl border border-slate-600 bg-slate-800/50 p-6">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center font-bold text-white">
            3
          </span>
          <div>
            <h3 className="font-semibold text-white mb-1">Eficiência Médica</h3>
            <p className="text-slate-400">
              Redução drástica no tempo de tela do médico e zero retrabalho com assinaturas
              manuais.
            </p>
          </div>
        </li>
        <li className="flex gap-4 rounded-xl border border-slate-600 bg-slate-800/50 p-6">
          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/80 flex items-center justify-center font-bold text-white">
            4
          </span>
          <div>
            <h3 className="font-semibold text-white mb-1">Pronto para Escalar</h3>
            <p className="text-slate-400">
              Arquitetura moderna permite integração futura com IA e outros sistemas corporativos
              via API.
            </p>
          </div>
        </li>
      </ul>
    </section>
  )
}
