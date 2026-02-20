"use client";
import Link from 'next/link';
import { useState } from 'react';
import { FileText, Presentation, BookOpen, Search } from 'lucide-react';

interface Guide {
  title: string;
  href: string;
  external?: boolean;
  badge?: string;
  description?: string;
  icon?: 'presentation' | 'book';
}

const guides: Guide[] = [
  { 
    title: 'Apresentação para TI', 
    href: '/api/docs/presentation?type=ti', 
    external: true, 
    badge: 'Slides',
    description: 'Arquitetura técnica, segurança e integrações',
    icon: 'presentation'
  },
  { 
    title: 'Apresentação para Médicos', 
    href: '/api/docs/presentation?type=medicos', 
    external: true, 
    badge: 'Slides',
    description: 'Funcionalidades clínicas e prontuário eletrônico',
    icon: 'presentation'
  },
  { 
    title: 'Apresentação para Pacientes', 
    href: '/api/docs/presentation?type=pacientes', 
    external: true, 
    badge: 'Slides',
    description: 'Portal do paciente e acesso à saúde digital',
    icon: 'presentation'
  },
  { 
    title: 'Backup', 
    href: '/docs/backup',
    description: 'Estratégias de backup e recuperação de dados',
    icon: 'book'
  },
  { 
    title: 'Deploy', 
    href: '/docs/deploy',
    description: 'Guia de instalação e configuração',
    icon: 'book'
  },
  { 
    title: 'Implementação', 
    href: '/docs/implementation',
    description: 'Processo de implementação e onboarding',
    icon: 'book'
  },
  { 
    title: 'Templates', 
    href: '/docs/templates',
    description: 'Modelos de documentos e formulários',
    icon: 'book'
  },
  { 
    title: 'Questionários', 
    href: '/docs/questionnaire',
    description: 'Sistema de questionários e avaliações',
    icon: 'book'
  },
  { 
    title: 'Termos e Compliance', 
    href: '/docs/terms',
    description: 'LGPD, termos de uso e privacidade',
    icon: 'book'
  },
  { 
    title: 'Testes', 
    href: '/docs/testing',
    description: 'Guia de testes e qualidade',
    icon: 'book'
  },
  { 
    title: 'Auditoria e Qualidade', 
    href: '/docs/audit',
    description: 'Auditoria, logs e monitoramento',
    icon: 'book'
  },
];

export default function DocsIndex() {
  const [search, setSearch] = useState('');
  const filtered = guides.filter(g =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <main className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Documentação HealthCare</h1>
        <p className="text-lg text-gray-600">
          Guias técnicos, apresentações e recursos para profissionais de saúde
        </p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar documentação..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid de documentos */}
      <div className="grid md:grid-cols-2 gap-6">
        {filtered.map(g => (
          <div key={g.href} className="group">
            {g.external ? (
              <a 
                href={g.href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition bg-white"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    g.icon === 'presentation' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {g.icon === 'presentation' ? (
                      <Presentation className="h-6 w-6 text-purple-600" />
                    ) : (
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition">
                        {g.title}
                      </h3>
                      {g.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                          {g.badge}
                        </span>
                      )}
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                    {g.description && (
                      <p className="text-sm text-gray-600">{g.description}</p>
                    )}
                  </div>
                </div>
              </a>
            ) : (
              <Link 
                href={g.href}
                className="block p-6 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition bg-white"
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2">
                      {g.title}
                    </h3>
                    {g.description && (
                      <p className="text-sm text-gray-600">{g.description}</p>
                    )}
                  </div>
                </div>
              </Link>
            )}
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhum documento encontrado.</p>
          </div>
        )}
      </div>
    </main>
  );
}
