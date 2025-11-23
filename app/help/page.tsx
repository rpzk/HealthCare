'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  HelpCircle, 
  Search,
  BookOpen,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Play,
  FileText,
  Users,
  Settings,
  Activity,
  Calendar,
  Target,
  Shield,
  Zap
} from 'lucide-react'

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'Todas', icon: BookOpen },
    { id: 'getting-started', name: 'Começando', icon: Play },
    { id: 'patients', name: 'Pacientes', icon: Users },
    { id: 'consultations', name: 'Consultas', icon: Calendar },
    { id: 'exams', name: 'Exames', icon: Target },
    { id: 'settings', name: 'Configurações', icon: Settings },
    { id: 'security', name: 'Segurança', icon: Shield },
    { id: 'advanced', name: 'Avançado', icon: Zap }
  ]

  const helpTopics = [
    {
      id: 1,
      category: 'getting-started',
      title: 'Como fazer login no sistema',
      description: 'Aprenda a acessar sua conta no HealthCare',
      type: 'article',
      readTime: '2 min',
      popular: true
    },
    {
      id: 2,
      category: 'getting-started',
      title: 'Tour pelo dashboard principal',
      description: 'Conheça as funcionalidades básicas do painel',
      type: 'video',
      readTime: '5 min',
      popular: true
    },
    {
      id: 3,
      category: 'patients',
      title: 'Cadastrar novo paciente',
      description: 'Passo a passo para adicionar pacientes ao sistema',
      type: 'article',
      readTime: '3 min',
      popular: true
    },
    {
      id: 4,
      category: 'patients',
      title: 'Buscar e filtrar pacientes',
      description: 'Como encontrar rapidamente informações de pacientes',
      type: 'article',
      readTime: '2 min',
      popular: false
    },
    {
      id: 5,
      category: 'patients',
      title: 'Gerenciar histórico médico',
      description: 'Visualizar e editar o histórico médico completo',
      type: 'video',
      readTime: '4 min',
      popular: false
    },
    {
      id: 6,
      category: 'consultations',
      title: 'Agendar nova consulta',
      description: 'Como criar e gerenciar agendamentos',
      type: 'article',
      readTime: '3 min',
      popular: true
    },
    {
      id: 7,
      category: 'consultations',
      title: 'Cancelar ou reagendar consultas',
      description: 'Gerenciar mudanças nos agendamentos',
      type: 'article',
      readTime: '2 min',
      popular: false
    },
    {
      id: 8,
      category: 'consultations',
      title: 'Visualizar agenda diária',
      description: 'Como usar o calendário e vista do dia',
      type: 'video',
      readTime: '3 min',
      popular: true
    },
    {
      id: 9,
      category: 'exams',
      title: 'Solicitar exames laboratoriais',
      description: 'Como criar solicitações de exames',
      type: 'article',
      readTime: '4 min',
      popular: false
    },
    {
      id: 10,
      category: 'exams',
      title: 'Visualizar resultados de exames',
      description: 'Acessar e interpretar resultados disponíveis',
      type: 'article',
      readTime: '3 min',
      popular: true
    },
    {
      id: 11,
      category: 'settings',
      title: 'Configurar notificações',
      description: 'Personalizar alertas e lembretes do sistema',
      type: 'article',
      readTime: '2 min',
      popular: false
    },
    {
      id: 12,
      category: 'settings',
      title: 'Alterar informações do perfil',
      description: 'Como atualizar seus dados pessoais',
      type: 'article',
      readTime: '2 min',
      popular: false
    },
    {
      id: 13,
      category: 'security',
      title: 'Alterar senha de acesso',
      description: 'Passo a passo para atualizar sua senha',
      type: 'article',
      readTime: '1 min',
      popular: true
    },
    {
      id: 14,
      category: 'security',
      title: 'Ativar autenticação em duas etapas',
      description: 'Configurar 2FA para maior segurança',
      type: 'video',
      readTime: '3 min',
      popular: false
    },
    {
      id: 15,
      category: 'advanced',
      title: 'Integração com IA médica',
      description: 'Como usar o assistente de IA para diagnósticos',
      type: 'video',
      readTime: '8 min',
      popular: true
    },
    {
      id: 16,
      category: 'advanced',
      title: 'Exportar relatórios personalizados',
      description: 'Gerar e personalizar relatórios de dados',
      type: 'article',
      readTime: '5 min',
      popular: false
    }
  ]

  const filteredTopics = helpTopics.filter(topic => {
    const matchesCategory = selectedCategory === 'all' || topic.category === selectedCategory
    const matchesSearch = searchTerm === '' || 
      topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  const popularTopics = helpTopics.filter(topic => topic.popular).slice(0, 6)

  const quickActions = [
    {
      title: 'Chat ao Vivo',
      description: 'Converse com nossa equipe de suporte',
      icon: MessageCircle,
      action: 'chat',
      available: true,
      estimatedWait: '< 2 min'
    },
    {
      title: 'Solicitar Suporte',
      description: 'Abrir ticket para problemas técnicos',
      icon: HelpCircle,
      action: 'ticket',
      available: true
    },
    {
      title: 'Agendar Treinamento',
      description: 'Sessão personalizada com especialista',
      icon: Calendar,
      action: 'training',
      available: true,
      duration: '30-60 min'
    },
    {
      title: 'Contato por Telefone',
      description: 'Suporte por telefone em horário comercial',
      icon: Phone,
      action: 'phone',
      available: false,
      hours: '9h às 18h'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <HelpCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Ajuda</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Encontre respostas, tutoriais e entre em contato com nosso suporte
          </p>
        </div>
      </div>

      {/* Barra de Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Pesquisar por tópicos, funcionalidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tópicos Populares */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>Tópicos Populares</span>
          </CardTitle>
          <CardDescription>
            Os guias mais acessados pelos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTopics.map(topic => (
              <div
                key={topic.id}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {topic.type === 'video' ? (
                      <Play className="h-4 w-4 text-red-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-blue-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {topic.readTime}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-medium text-foreground mb-1">{topic.title}</h3>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categorias */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {categories.map(category => {
                  const Icon = category.icon
                  const count = category.id === 'all' 
                    ? helpTopics.length 
                    : helpTopics.filter(t => t.category === category.id).length
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Artigos */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedCategory === 'all' ? 'Todos os Artigos' : 
                 categories.find(c => c.id === selectedCategory)?.name || 'Artigos'}
              </CardTitle>
              <CardDescription>
                {filteredTopics.length} resultado(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTopics.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Tente ajustar seus termos de busca ou escolha uma categoria diferente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTopics.map(topic => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="mt-1">
                          {topic.type === 'video' ? (
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                              <Play className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                          ) : (
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-foreground">{topic.title}</h3>
                            {topic.popular && (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800 text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{topic.description}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{topic.type === 'video' ? 'Vídeo' : 'Artigo'}</span>
                            <span>•</span>
                            <span>{topic.readTime}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Opções de Suporte */}
      <Card>
        <CardHeader>
          <CardTitle>Precisa de Mais Ajuda?</CardTitle>
          <CardDescription>
            Entre em contato com nossa equipe de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg transition-colors ${
                    action.available 
                      ? 'hover:shadow-md cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      action.available ? 'bg-green-100 dark:bg-green-900/20' : 'bg-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        action.available ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{action.title}</h3>
                      {action.available ? (
                        <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800 text-xs">
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Indisponível
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {action.estimatedWait && (
                      <p>Tempo de espera: {action.estimatedWait}</p>
                    )}
                    {action.duration && (
                      <p>Duração: {action.duration}</p>
                    )}
                    {action.hours && (
                      <p>Horário: {action.hours}</p>
                    )}
                  </div>

                  {action.available && (
                    <Button 
                      className="w-full mt-3" 
                      variant={action.action === 'chat' ? 'default' : 'outline'}
                    >
                      {action.action === 'chat' && 'Iniciar Chat'}
                      {action.action === 'ticket' && 'Abrir Ticket'}
                      {action.action === 'training' && 'Agendar'}
                      {action.action === 'phone' && 'Ligar'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contatos Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Email</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Para dúvidas gerais e suporte técnico
            </p>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              suporte@healthcare.com
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Phone className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Telefone</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Atendimento em horário comercial
            </p>
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              +55 11 4000-0000
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <ExternalLink className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-2">Documentação</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Guia completo do desenvolvedor
            </p>
            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
              docs.healthcare.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
