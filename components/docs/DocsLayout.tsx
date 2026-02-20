"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { Heart, Home, ArrowLeft } from 'lucide-react';

const guides = [
  { title: 'Backup', href: '/docs/backup' },
  { title: 'Deploy', href: '/docs/deploy' },
  { title: 'Implementação', href: '/docs/implementation' },
  { title: 'Templates', href: '/docs/templates' },
  { title: 'Questionários', href: '/docs/questionnaire' },
  { title: 'Termos e Compliance', href: '/docs/terms' },
  { title: 'Testes', href: '/docs/testing' },
  { title: 'Auditoria e Qualidade', href: '/docs/audit' },
];

export function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRoot = pathname === '/docs';
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header consistente com landing page */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition">
                <Heart className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">HealthCare</span>
              </Link>
              <span className="text-sm text-gray-500">/ Documentação</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition font-medium"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Página Inicial</span>
              </Link>
              <Link 
                href="/auth/signin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-gray-200 bg-white p-6 min-h-[calc(100vh-4rem)]">
          {!isRoot && (
            <Link 
              href="/docs" 
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition mb-6 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Índice</span>
            </Link>
          )}
          
          <h2 className="text-xl font-bold mb-6 text-gray-900">Guias</h2>
          <nav className="flex-1">
            <ul className="space-y-1">
              {guides.map(g => (
                <li key={g.href}>
                  <Link 
                    href={g.href} 
                    className={`block px-3 py-2 rounded-lg transition font-medium ${
                      pathname === g.href 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        
        {/* Main content */}
        <div className="flex-1 px-4 py-8 md:px-12 md:py-10">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
