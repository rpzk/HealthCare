'use client'

export function Slide1Capa() {
  return (
    <section className="min-h-screen flex flex-col justify-center items-center px-12 py-16 bg-slate-900 text-slate-200 relative">
      <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
        HealthCare System
      </h1>
      <p className="text-xl md:text-2xl text-slate-300 mb-12">
        Governança Clínica e Arquitetura Cloud-Native
      </p>
      <div className="flex flex-wrap gap-3 justify-center mb-16">
        <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-600/80 text-white border border-blue-500/50">
          100% Azure Ready
        </span>
        <span className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600/80 text-white border border-emerald-500/50">
          Conformidade LGPD
        </span>
        <span className="px-4 py-2 rounded-full text-sm font-medium bg-amber-600/80 text-white border border-amber-500/50">
          Padrão CFM
        </span>
      </div>
      <footer className="absolute bottom-8 left-0 right-0 text-center text-sm text-slate-500">
        Apresentação de Infraestrutura e Mitigação de Riscos - Propay
      </footer>
    </section>
  )
}
