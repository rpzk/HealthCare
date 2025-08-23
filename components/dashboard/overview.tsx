'use client'

import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  UserCheck,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const stats = [
  {
    title: 'Total de Pacientes',
    value: '1,247',
    change: '+12%',
    changeType: 'positive' as const,
    icon: Users,
    color: 'bg-blue-500'
  },
  {
    title: 'Consultas Hoje',
    value: '23',
    change: '+5',
    changeType: 'positive' as const,
    icon: Calendar,
    color: 'bg-green-500'
  },
  {
    title: 'Prontuários Atualizados',
    value: '89',
    change: '+18%',
    changeType: 'positive' as const,
    icon: FileText,
    color: 'bg-purple-500'
  },
  {
    title: 'Taxa de Conclusão',
    value: '94%',
    change: '+2%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    color: 'bg-orange-500'
  }
]

const recentPatients = [
  {
    id: '1',
    name: 'Maria Santos',
    age: 45,
    lastVisit: '2024-08-23',
    status: 'Em tratamento',
    priority: 'normal'
  },
  {
    id: '2',
    name: 'João Silva',
    age: 62,
    lastVisit: '2024-08-22',
    status: 'Aguardando exame',
    priority: 'high'
  },
  {
    id: '3',
    name: 'Ana Costa',
    age: 34,
    lastVisit: '2024-08-21',
    status: 'Consulta de retorno',
    priority: 'normal'
  }
]

const upcomingAppointments = [
  {
    id: '1',
    patient: 'Carlos Oliveira',
    time: '14:00',
    type: 'Consulta inicial',
    duration: '30 min'
  },
  {
    id: '2',
    patient: 'Fernanda Lima',
    time: '15:30',
    type: 'Retorno',
    duration: '20 min'
  },
  {
    id: '3',
    patient: 'Roberto Alves',
    time: '16:30',
    type: 'Consulta de rotina',
    duration: '25 min'
  }
]

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      vs. mês anterior
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas consultas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Próximas Consultas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div 
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {appointment.patient}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {appointment.time}
                    </p>
                    <p className="text-sm text-gray-600">
                      {appointment.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              Ver Agenda Completa
            </Button>
          </CardContent>
        </Card>

        {/* Pacientes recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Pacientes Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPatients.map((patient) => (
                <div 
                  key={patient.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {patient.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {patient.age} anos • {patient.lastVisit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${
                      patient.priority === 'high' 
                        ? 'status-emergency' 
                        : 'status-active'
                    }`}>
                      {patient.status}
                    </span>
                    {patient.priority === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-4" variant="outline">
              Ver Todos os Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Ações Rápidas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <Users className="h-6 w-6" />
              <span>Novo Paciente</span>
            </Button>
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <Calendar className="h-6 w-6" />
              <span>Agendar Consulta</span>
            </Button>
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <FileText className="h-6 w-6" />
              <span>Criar Prontuário</span>
            </Button>
            <Button className="h-20 flex flex-col space-y-2" variant="medical">
              <Activity className="h-6 w-6" />
              <span>Assistente IA</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
