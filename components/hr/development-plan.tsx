'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  Target,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Gem,
  Brain,
  ChevronDown,
  ChevronRight,
  Trophy,
  Star,
  Loader2,
  Trash2,
  Edit,
  Wand2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface Action {
  id: string
  title: string
  description?: string
  frequency: string
  completed: boolean
  completedAt?: string
}

interface Goal {
  id: string
  title: string
  description?: string
  category: string
  strengthCode?: string
  status: string
  progress: number
  targetDate?: string
  actions: Action[]
}

interface Milestone {
  id: string
  title: string
  description?: string
  targetDate?: string
  achieved: boolean
  achievedAt?: string
  celebration?: string
}

interface DevelopmentPlan {
  id: string
  title: string
  futureVision?: string
  currentStratum?: string
  targetStratum?: string
  primaryStrengths?: string
  status: string
  startDate: string
  targetDate?: string
  goals: Goal[]
  milestones: Milestone[]
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  HEALTH: { label: 'Saúde', color: 'bg-green-100 text-green-700' },
  CAREER: { label: 'Carreira', color: 'bg-blue-100 text-blue-700' },
  PERSONAL: { label: 'Pessoal', color: 'bg-purple-100 text-purple-700' },
  RELATIONSHIP: { label: 'Relações', color: 'bg-pink-100 text-pink-700' },
  FINANCIAL: { label: 'Financeiro', color: 'bg-yellow-100 text-yellow-700' },
  SPIRITUAL: { label: 'Espiritual', color: 'bg-indigo-100 text-indigo-700' },
}

const frequencyLabels: Record<string, string> = {
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  ONCE: 'Uma vez',
}

export function DevelopmentPlanComponent() {
  const [plan, setPlan] = useState<DevelopmentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set())
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showEditVision, setShowEditVision] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'HEALTH',
  })
  const [editedVision, setEditedVision] = useState('')

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/development/plans')
      if (!res.ok) throw new Error('Erro ao buscar plano')
      const plans = await res.json()
      if (plans.length > 0) {
        setPlan(plans[0])
        setEditedVision(plans[0].futureVision || '')
      }
    } catch (error) {
      logger.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  const generatePlan = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/development/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusArea: 'Saúde Integral' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao gerar plano')
      }

      const newPlan = await res.json()
      setPlan(newPlan)
      setEditedVision(newPlan.futureVision || '')
      toast({ title: 'Plano gerado com sucesso!' })
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: error instanceof Error ? error.message : 'Erro ao gerar plano', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  const toggleAction = async (action: Action) => {
    try {
      const res = await fetch(`/api/development/actions?id=${action.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !action.completed }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar ação')

      // Refetch plan to get updated progress
      fetchPlan()
      toast({ title: action.completed ? 'Ação desmarcada' : 'Ação concluída! 🎉' })
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: 'Erro ao atualizar ação', variant: 'destructive' })
    }
  }

  const toggleMilestone = async (milestone: Milestone) => {
    try {
      const res = await fetch(`/api/development/milestones?id=${milestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achieved: !milestone.achieved }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar marco')

      fetchPlan()
      
      if (!milestone.achieved && milestone.celebration) {
        toast({ title: milestone.celebration })
      }
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: 'Erro ao atualizar marco', variant: 'destructive' })
    }
  }

  const addGoal = async () => {
    if (!plan || !newGoal.title) return

    try {
      const res = await fetch('/api/development/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          ...newGoal,
        }),
      })

      if (!res.ok) throw new Error('Erro ao adicionar meta')

      setShowAddGoal(false)
      setNewGoal({ title: '', description: '', category: 'HEALTH' })
      fetchPlan()
      toast({ title: 'Meta adicionada!' })
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: 'Erro ao adicionar meta', variant: 'destructive' })
    }
  }

  const updateVision = async () => {
    if (!plan) return

    try {
      const res = await fetch(`/api/development/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ futureVision: editedVision }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar visão')

      setShowEditVision(false)
      fetchPlan()
      toast({ title: 'Visão atualizada!' })
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: 'Erro ao atualizar visão', variant: 'destructive' })
    }
  }

  const deleteGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/development/goals?id=${goalId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Erro ao remover meta')

      fetchPlan()
      toast({ title: 'Meta removida' })
    } catch (error) {
      logger.error('Erro:', error)
      toast({ title: 'Erro ao remover meta', variant: 'destructive' })
    }
  }

  const calculateOverallProgress = () => {
    if (!plan?.goals.length) return 0
    const totalProgress = plan.goals.reduce((sum, g) => sum + g.progress, 0)
    return Math.round(totalProgress / plan.goals.length)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Estado inicial - sem plano
  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Plano de Desenvolvimento Pessoal
          </CardTitle>
          <CardDescription>
            Crie um roteiro personalizado de crescimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <Wand2 className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Gere seu Plano Personalizado
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Com base nas suas avaliações de Horizonte Temporal e Forças de Caráter, 
              criaremos um plano único para você.
            </p>
            <Button 
              onClick={generatePlan} 
              disabled={generating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando seu plano...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Meu Plano
                </>
              )}
            </Button>

            <div className="mt-8 p-4 bg-amber-50 rounded-lg text-sm text-amber-700">
              <p>
                💡 <strong>Dica:</strong> Para um plano mais completo, complete 
                primeiro as avaliações de Horizonte Temporal e Forças de Caráter.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Com plano - exibir dashboard
  const overallProgress = calculateOverallProgress()
  const achievedMilestones = plan.milestones.filter(m => m.achieved).length
  const strengths = plan.primaryStrengths ? JSON.parse(plan.primaryStrengths) : []

  return (
    <div className="space-y-6">
      {/* Header do Plano */}
      <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {plan.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>
                  Iniciado em {new Date(plan.startDate).toLocaleDateString('pt-BR')}
                </span>
                {plan.targetDate && (
                  <>
                    <span>•</span>
                    <span>
                      Meta: {new Date(plan.targetDate).toLocaleDateString('pt-BR')}
                    </span>
                  </>
                )}
              </div>
            </div>
            <Badge 
              variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}
              className={plan.status === 'ACTIVE' ? 'bg-green-600' : ''}
            >
              {plan.status === 'ACTIVE' ? 'Em andamento' : plan.status}
            </Badge>
          </div>

          {/* Progresso Geral */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Progresso Geral</span>
              <span className="text-green-600 font-bold">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{plan.goals.length}</div>
              <div className="text-xs text-gray-500">Metas</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {plan.goals.reduce((sum, g) => sum + g.actions.length, 0)}
              </div>
              <div className="text-xs text-gray-500">Ações</div>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">
                {achievedMilestones}/{plan.milestones.length}
              </div>
              <div className="text-xs text-gray-500">Marcos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visão de Futuro */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Minha Visão de Futuro
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowEditVision(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 italic">
            "{plan.futureVision || 'Clique para adicionar sua visão de futuro...'}"
          </p>
          
          {strengths.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-2">Forças Principais:</p>
              <div className="flex flex-wrap gap-2">
                {strengths.map((code: string) => (
                  <Badge key={code} variant="outline" className="bg-purple-50">
                    <Gem className="h-3 w-3 mr-1" />
                    {code}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-600" />
            Marcos de Progresso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  milestone.achieved
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <button
                  onClick={() => toggleMilestone(milestone)}
                  className="flex-shrink-0"
                >
                  {milestone.achieved ? (
                    <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${milestone.achieved ? 'text-green-700' : ''}`}>
                    {milestone.title}
                  </p>
                  {milestone.description && (
                    <p className="text-sm text-gray-500">{milestone.description}</p>
                  )}
                  {milestone.targetDate && (
                    <p className="text-xs text-gray-400 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(milestone.targetDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                {index < plan.milestones.length - 1 && !milestone.achieved && (
                  <div className="w-px h-8 bg-gray-200 absolute left-7 mt-10" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metas e Ações */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Metas e Ações
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddGoal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Meta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.goals.map((goal) => (
              <div
                key={goal.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Goal Header */}
                <div
                  className="flex items-center gap-3 p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleGoalExpanded(goal.id)}
                >
                  <button className="flex-shrink-0">
                    {expandedGoals.has(goal.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{goal.title}</h4>
                      <Badge className={categoryLabels[goal.category]?.color || ''}>
                        {categoryLabels[goal.category]?.label || goal.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Progress value={goal.progress} className="w-20 h-2" />
                        <span className="text-gray-500">{goal.progress}%</span>
                      </div>
                      <span className="text-gray-400">
                        {goal.actions.filter(a => a.completed).length}/{goal.actions.length} ações
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteGoal(goal.id)
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Goal Actions */}
                {expandedGoals.has(goal.id) && (
                  <div className="p-4 border-t bg-white">
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      {goal.actions.map((action) => (
                        <div
                          key={action.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            action.completed
                              ? 'bg-green-50'
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <Checkbox
                            checked={action.completed}
                            onCheckedChange={() => toggleAction(action)}
                          />
                          <div className="flex-1">
                            <p className={action.completed ? 'line-through text-gray-400' : ''}>
                              {action.title}
                            </p>
                            {action.description && (
                              <p className="text-xs text-gray-500">{action.description}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {frequencyLabels[action.frequency]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog - Adicionar Meta */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Meta</DialogTitle>
            <DialogDescription>
              Adicione uma nova meta ao seu plano de desenvolvimento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="Ex: Praticar exercícios regularmente"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Descrição (opcional)</label>
              <Textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="Descreva sua meta..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select
                value={newGoal.category}
                onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGoal(false)}>
              Cancelar
            </Button>
            <Button onClick={addGoal} disabled={!newGoal.title}>
              Adicionar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Editar Visão */}
      <Dialog open={showEditVision} onOpenChange={setShowEditVision}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minha Visão de Futuro</DialogTitle>
            <DialogDescription>
              Descreva onde você se vê no futuro - seja específico e inspirador
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={editedVision}
            onChange={(e) => setEditedVision(e.target.value)}
            placeholder="Daqui a X meses, me vejo como..."
            rows={5}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditVision(false)}>
              Cancelar
            </Button>
            <Button onClick={updateVision}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
