import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import prisma from '@/lib/prisma'
import { RequestAccessForm } from './request-access-form'

export const dynamic = 'force-dynamic'

export default async function RegisterLandingPage() {
  const adminCount = await prisma.user.count({
    where: {
      role: 'ADMIN',
      isActive: true
    }
  })

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>
            O cadastro no HealthCare é feito por link de convite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Se você recebeu um convite, abra o link completo do convite recebido.
            </p>
            {adminCount === 0 ? (
              <p>
                Para criar o administrador inicial, execute o script no servidor (o script solicitará os dados reais no terminal):
              </p>
            ) : (
              <p>
                Não tem conta? Envie um pedido de cadastro para a equipe responsável.
              </p>
            )}
          </div>

          {adminCount === 0 && (
            <pre className="text-xs whitespace-pre-wrap rounded-md border bg-muted p-3">{
              'docker exec -it healthcare-app npx tsx scripts/setup-admin.ts'
            }</pre>
          )}

          {adminCount > 0 && (
            <RequestAccessForm />
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" asChild>
              <Link href="/auth/signin">Ir para Login</Link>
            </Button>
            <Button asChild>
              <Link href="/">Voltar ao início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
