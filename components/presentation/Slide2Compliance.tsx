'use client'

export function Slide2Compliance() {
  return (
    <section className="min-h-screen flex flex-col px-12 py-16 bg-slate-900 text-slate-200">
      <h2 className="text-3xl font-bold text-white mb-10 border-b border-slate-600 pb-4">
        O Desafio de Compliance & A Solução
      </h2>
      <div className="grid md:grid-cols-2 gap-8 flex-1">
        {/* Coluna Esquerda - O Risco Atual */}
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <h3 className="text-xl font-semibold text-red-300 mb-6">
            Cenário Atual (Formulários Genéricos)
          </h3>
          <ul className="space-y-4 text-slate-300">
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong className="text-red-200">Risco Crítico LGPD:</strong> Dados sensíveis
                de saúde trafegando sem criptografia ponta a ponta adequada para o setor.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong className="text-red-200">Ausência de Rastreabilidade:</strong>{' '}
                Impossibilidade de auditar quem acessou ou alterou um dado (Falta de Logs).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-red-400 font-bold">•</span>
              <span>
                <strong className="text-red-200">Insegurança Jurídica:</strong> Sem integração
                com certificação digital ICP-Brasil.
              </span>
            </li>
          </ul>
        </div>

        {/* Coluna Direita - A Solução */}
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-6">
          <h3 className="text-xl font-semibold text-emerald-300 mb-6">
            Cenário Proposto (HealthCare)
          </h3>
          <ul className="space-y-4 text-slate-300">
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong className="text-emerald-200">Privacy by Design:</strong> Controle de
                Acesso Baseado em Função (RBAC) – O RH não vê o que o médico vê.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong className="text-emerald-200">Auditoria Completa:</strong> Logs
                imutáveis de cada acesso, edição ou exclusão.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong className="text-emerald-200">Segurança CFM:</strong> Assinatura Digital
                A1 nativa no prontuário.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
