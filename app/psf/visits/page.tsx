import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar } from "lucide-react"
import Link from "next/link"

export default function VisitsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visitas Domiciliares</h1>
          <p className="text-muted-foreground">
            Registro e acompanhamento de visitas dos Agentes Comunitários de Saúde.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Nova Visita
        </Button>
      </div>

      <Card className="text-center py-12">
        <CardContent>
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Nenhuma visita registrada</h3>
          <p className="text-muted-foreground mt-2">
            O módulo de visitas está sendo configurado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
