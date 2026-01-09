import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Markdown } from '@/components/ui/markdown'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function TermsPage() {
  const term = await prisma.term.findFirst({
    where: { slug: 'terms-of-use', isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>{term?.title || 'Termos de Uso'}</CardTitle>
          <CardDescription>
            {term ? `Versão ${term.version} • Atualizado em ${new Date(term.updatedAt).toLocaleDateString('pt-BR')}` : 'Conteúdo indisponível'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {term ? (
            <Markdown content={term.content} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma versão ativa encontrada para este termo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
