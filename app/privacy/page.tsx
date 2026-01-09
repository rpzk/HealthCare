import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Markdown } from '@/components/ui/markdown'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PrivacyPage() {
  const term = await prisma.term.findFirst({
    where: { slug: 'privacy-policy', isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>{term?.title || 'Política de Privacidade'}</CardTitle>
          <CardDescription>
            {term ? `Versão ${term.version} • Atualizado em ${new Date(term.updatedAt).toLocaleDateString('pt-BR')}` : 'Conteúdo indisponível'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {term ? (
            <Markdown content={term.content} />
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma versão ativa encontrada para esta política.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
