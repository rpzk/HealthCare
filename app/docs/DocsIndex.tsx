import Link from 'next/link';
import { useState } from 'react';

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

export default function DocsIndex() {
  const [search, setSearch] = useState('');
  const filtered = guides.filter(g =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <main className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Documentação HealthCare</h1>
      <input
        type="text"
        placeholder="Buscar por título..."
        className="border rounded px-3 py-2 mb-6 w-full"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <ul className="space-y-3">
        {filtered.map(g => (
          <li key={g.href}>
            <Link href={g.href} className="text-blue-600 hover:underline text-lg font-medium">
              {g.title}
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-gray-500">Nenhum resultado encontrado.</li>
        )}
      </ul>
    </main>
  );
}
