import { getServerSession, type Session } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

interface Props { params: { id: string } }

export default async function TelePage({ params }: Props){
  const session = await getServerSession(authOptions).catch(() => null) as Session | null
  const userId = session?.user?.id as string | undefined
  
  if (!userId){
    return <div className="p-6 text-sm text-destructive">Você precisa estar autenticado.</div>
  }

  redirect(`/consultations/${params.id}?tele=1`)
}
