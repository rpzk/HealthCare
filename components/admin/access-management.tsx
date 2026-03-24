'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Users, Shield, ArrowLeft } from 'lucide-react'
import { PatientCareTeam } from '@/components/patients/patient-care-team'

interface PatientSearchResult {
  id: string
  name: string
  cpf?: string
  email?: string
}

export function AccessManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm || searchTerm.length < 3) return

    setIsSearching(true)
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data)
      }
    } catch (error) {
      console.error('Search failed', error)
    } finally {
      setIsSearching(false)
    }
  }

  if (selectedPatient) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedPatient(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestão de Equipe: {selectedPatient.name}</h2>
            <p className="text-muted-foreground">Adicione ou remova profissionais da equipe de atendimento deste paciente.</p>
          </div>
        </div>
        <PatientCareTeam patientId={selectedPatient.id} patientName={selectedPatient.name} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Equipes de Cuidado</h2>
        <p className="text-muted-foreground">
          Busque um paciente para gerenciar quais profissionais têm acesso ao seu prontuário.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Paciente
          </CardTitle>
          <CardDescription>
            Busque por nome, e-mail ou CPF para gerenciar a equipe de cuidado (acessos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              placeholder="Digite o nome, e-mail ou CPF do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit" disabled={isSearching || searchTerm.length < 3}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <div className="rounded-md border">
              <div className="grid gap-2 p-4">
                {searchResults.map(patient => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.email || 'Sem e-mail'} {patient.cpf && `• CPF: ***.${patient.cpf.slice(3, 6)}.***-**`}
                        </p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm">
                      <Shield className="h-4 w-4 mr-2" />
                      Gerenciar Acessos
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchTerm !== '' && !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum paciente encontrado com &quot;{searchTerm}&quot;.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
