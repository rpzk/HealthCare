import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = 'force-dynamic';

export default async function FamiliesPage() {
  let families: any[] = [];
  
  try {
    if (prisma) {
      families = await prisma.household.findMany({
        include: {
          _count: {
            select: { members: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
  } catch (error) {
    console.error("Failed to fetch families (likely build time or DB offline):", error);
    // Return empty array to allow build to proceed
    families = [];
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Famílias</h1>
          <p className="text-muted-foreground">
            Gerenciamento de domicílios e núcleos familiares.
          </p>
        </div>
        <Link href="/psf/families/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Família
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Famílias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Referência</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {families.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma família cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                families.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell className="font-medium">{family.name}</TableCell>
                    <TableCell>
                      {family.address}, {family.number}
                      {family.complement && ` - ${family.complement}`}
                    </TableCell>
                    <TableCell>{family.neighborhood}</TableCell>
                    <TableCell>{family._count.members} pessoas</TableCell>
                    <TableCell>{new Date(family.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/psf/families/${family.id}`}>
                          Detalhes
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
