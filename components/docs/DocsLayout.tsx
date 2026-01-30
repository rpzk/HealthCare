"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

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
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card p-6">
        <h2 className="text-xl font-bold mb-6 text-primary">Documentação</h2>
        <nav className="flex-1">
          <ul className="space-y-2">
            {guides.map(g => (
              <li key={g.href}>
                <Link href={g.href} className={`block px-3 py-2 rounded transition-all duration-150 font-medium ${pathname === g.href ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-primary'}`}>
                  {g.title}
                </Link>
              </li>
            ))}
            {/* Link para docs privados, visível apenas se autenticado (placeholder, lógica real pode ser adicionada depois) */}
            <li>
              <Link href="/docs/private" className="block px-3 py-2 rounded transition-all duration-150 font-medium hover:bg-accent hover:text-primary text-orange-700">
                Documentação Privada
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/docs" className="text-2xl font-bold text-primary">HealthCare Docs</Link>
            <span className="hidden md:inline text-xs text-muted-foreground ml-2">Documentação oficial do sistema</span>
          </div>
          {/* Dark mode toggle placeholder */}
          <button className="rounded p-2 hover:bg-accent transition" title="Alternar modo claro/escuro">
            <span className="i-lucide-moon text-xl" />
          </button>
        </header>
        {/* Breadcrumbs */}
        <nav className="px-4 py-2 text-sm text-muted-foreground">
          <span><Link href="/docs" className="hover:underline">Documentação</Link></span>
          {guides.map(g => pathname === g.href && (
            <span key={g.href}> / <span className="text-primary font-semibold">{g.title}</span></span>
          ))}
        </nav>
        <main className="flex-1 px-4 py-8 md:px-12 md:py-10">
          <div className="max-w-2xl mx-auto card card-hover p-6 bg-card/80 shadow">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
