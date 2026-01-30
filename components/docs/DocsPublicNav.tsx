import Link from 'next/link';

export default function DocsPublicNav() {
  return (
    <nav className="flex gap-4 items-center">
      <Link href="/docs" className="hover:underline text-blue-700 font-medium">Documentação</Link>
    </nav>
  );
}
