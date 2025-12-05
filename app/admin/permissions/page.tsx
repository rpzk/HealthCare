'use client'

import { useEffect, useState } from 'react'
import { 
  Shield, 
  Key,
  Lock,
  Users,
  UserCheck,
  Loader2,
  Save,
  RefreshCw,
  Eye,
  Edit,
  Settings,
  AlertTriangle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from '@/hooks/use-toast'

const ROLES = [
  { id: 'ADMIN', name: 'Administrador', description: 'Acesso total ao sistema', color: 'bg-purple-100 text-purple-800' },
  { id: 'DOCTOR', name: 'Médico', description: 'Atendimentos e prescrições', color: 'bg-blue-100 text-blue-800' },
  { id: 'NURSE', name: 'Enfermeiro', description: 'Triagem e cuidados', color: 'bg-green-100 text-green-800' },
  { id: 'RECEPTIONIST', name: 'Recepcionista', description: 'Agendamentos e cadastros', color: 'bg-orange-100 text-orange-800' },
  { id: 'ACS', name: 'Agente de Saúde', description: 'Visitas e acompanhamento', color: 'bg-teal-100 text-teal-800' },
  { id: 'PHARMACIST', name: 'Farmacêutico', description: 'Dispensação de medicamentos', color: 'bg-pink-100 text-pink-800' },
  { id: 'LAB_TECH', name: 'Técnico Lab', description: 'Exames laboratoriais', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'PATIENT', name: 'Paciente', description: 'Acesso à área do paciente', color: 'bg-cyan-100 text-cyan-800' },
]

const PERMISSIONS = {
  patients: {
    name: 'Pacientes',
    items: ['view', 'create', 'edit', 'delete', 'export']
  },
  consultations: {
    name: 'Consultas',
    items: ['view', 'create', 'edit', 'cancel', 'complete']
  },
  prescriptions: {
    name: 'Prescrições',
    items: ['view', 'create', 'edit', 'print', 'sign']
  },
  exams: {
    name: 'Exames',
    items: ['view', 'request', 'upload', 'validate']
  },
  records: {
    name: 'Prontuários',
    items: ['view', 'edit', 'sign', 'export']
  },
  reports: {
    name: 'Relatórios',
    items: ['view', 'create', 'export']
  },
  admin: {
    name: 'Administração',
    items: ['users', 'settings', 'audit', 'security']
  }
}

const PERMISSION_LABELS: Record<string, string> = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
  cancel: 'Cancelar',
  complete: 'Concluir',
  print: 'Imprimir',
  sign: 'Assinar',
  request: 'Solicitar',
  upload: 'Upload',
  validate: 'Validar',
  users: 'Usuários',
  settings: 'Configurações',
  audit: 'Auditoria',
  security: 'Segurança'
}

// Permissões padrão por role
const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  ADMIN: {
    patients: ['view', 'create', 'edit', 'delete', 'export'],
    consultations: ['view', 'create', 'edit', 'cancel', 'complete'],
    prescriptions: ['view', 'create', 'edit', 'print', 'sign'],
    exams: ['view', 'request', 'upload', 'validate'],
    records: ['view', 'edit', 'sign', 'export'],
    reports: ['view', 'create', 'export'],
    admin: ['users', 'settings', 'audit', 'security']
  },
  DOCTOR: {
    patients: ['view', 'create', 'edit'],
    consultations: ['view', 'create', 'edit', 'complete'],
    prescriptions: ['view', 'create', 'edit', 'print', 'sign'],
    exams: ['view', 'request'],
    records: ['view', 'edit', 'sign'],
    reports: ['view'],
    admin: []
  },
  NURSE: {
    patients: ['view', 'edit'],
    consultations: ['view', 'edit'],
    prescriptions: ['view'],
    exams: ['view', 'upload'],
    records: ['view', 'edit'],
    reports: ['view'],
    admin: []
  },
  RECEPTIONIST: {
    patients: ['view', 'create', 'edit'],
    consultations: ['view', 'create', 'cancel'],
    prescriptions: ['view'],
    exams: ['view'],
    records: [],
    reports: ['view'],
    admin: []
  },
  PATIENT: {
    patients: [],
    consultations: ['view'],
    prescriptions: ['view'],
    exams: ['view'],
    records: ['view'],
    reports: [],
    admin: []
  }
}

export default function AdminPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>('DOCTOR')
  const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>>>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handlePermissionToggle = (category: string, permission: string) => {
    setPermissions(prev => {
      const rolePerms = { ...prev[selectedRole] }
      const categoryPerms = [...(rolePerms[category] || [])]
      
      if (categoryPerms.includes(permission)) {
        rolePerms[category] = categoryPerms.filter(p => p !== permission)
      } else {
        rolePerms[category] = [...categoryPerms, permission]
      }
      
      return { ...prev, [selectedRole]: rolePerms }
    })
  }

  const hasPermission = (category: string, permission: string) => {
    return permissions[selectedRole]?.[category]?.includes(permission) || false
  }

  const handleSave = async () => {
    setSaving(true)
    // Simular save - em produção, chamar API
    await new Promise(r => setTimeout(r, 1000))
    toast({
      title: 'Permissões salvas',
      description: 'As permissões foram atualizadas com sucesso'
    })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permissões do Sistema</h1>
          <p className="text-muted-foreground">
            Configure as permissões de acesso por função
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Atenção ao modificar permissões
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Alterações nas permissões afetam imediatamente todos os usuários com essa função.
                Certifique-se de revisar as mudanças antes de salvar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Funções</CardTitle>
            <CardDescription>Selecione uma função para editar</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                    selectedRole === role.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                    {selectedRole === role.id && (
                      <Badge variant="secondary">Selecionado</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissões: {ROLES.find(r => r.id === selectedRole)?.name}
                </CardTitle>
                <CardDescription>
                  {ROLES.find(r => r.id === selectedRole)?.description}
                </CardDescription>
              </div>
              <Badge className={ROLES.find(r => r.id === selectedRole)?.color}>
                {selectedRole}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={Object.keys(PERMISSIONS)} className="w-full">
              {Object.entries(PERMISSIONS).map(([category, data]) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span>{data.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {permissions[selectedRole]?.[category]?.length || 0}/{data.items.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                      {data.items.map(permission => (
                        <div
                          key={permission}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <span className="text-sm">
                            {PERMISSION_LABELS[permission] || permission}
                          </span>
                          <Switch
                            checked={hasPermission(category, permission)}
                            onCheckedChange={() => handlePermissionToggle(category, permission)}
                            disabled={selectedRole === 'ADMIN' && category === 'admin'}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
