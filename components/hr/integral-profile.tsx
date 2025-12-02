'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  Gem,
  Target,
  TrendingUp,
  Sparkles,
  Award,
  Star,
  Zap,
  Heart,
  Calendar,
  ArrowUpRight,
  Download,
  Share2,
  ChevronRight,
  Trophy,
  Flame,
  Crown,
  Shield,
  Lightbulb,
} from 'lucide-react'

interface StratumData {
  level: string
  timeSpanMonths: number
  completedAt: string
  confidence: number
}

interface StrengthData {
  code: string
  name: string
  virtue: string
  score: number
  rank: number
}

interface ProfileData {
  stratum: StratumData | null
  strengths: StrengthData[]
  plansCount: number
  goalsCompleted: number
  totalGoals: number
  currentStreak: number
  longestStreak: number
  achievements: Achievement[]
  evolutionHistory: Array<{ date: string; level: string }>
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
  progress?: number
}

interface IntegralProfileProps {
  userId?: string
  patientId?: string
  compact?: boolean
}

const virtueIcons: Record<string, typeof Heart> = {
  'Sabedoria': Lightbulb,
  'Coragem': Shield,
  'Humanidade': Heart,
  'Justiça': Crown,
  'Temperança': Target,
  'Transcendência': Sparkles,
}

const virtueColors: Record<string, string> = {
  'Sabedoria': 'from-blue-500 to-cyan-500',
  'Coragem': 'from-orange-500 to-red-500',
  'Humanidade': 'from-pink-500 to-rose-500',
  'Justiça': 'from-yellow-500 to-amber-500',
  'Temperança': 'from-green-500 to-emerald-500',
  'Transcendência': 'from-purple-500 to-violet-500',
}

const stratumDescriptions: Record<string, { name: string; description: string; color: string }> = {
  'S1': { name: 'Operacional', description: 'Foco em tarefas imediatas', color: 'from-gray-400 to-gray-500' },
  'S2': { name: 'Supervisor', description: 'Planejamento de curto prazo', color: 'from-green-400 to-green-600' },
  'S3': { name: 'Gerente', description: 'Visão de médio prazo', color: 'from-blue-400 to-blue-600' },
  'S4': { name: 'Diretor', description: 'Estratégia plurianual', color: 'from-purple-400 to-purple-600' },
  'S5': { name: 'VP', description: 'Visão de longo prazo', color: 'from-amber-400 to-amber-600' },
  'S6': { name: 'CEO', description: 'Transformação organizacional', color: 'from-red-400 to-red-600' },
  'S7': { name: 'Estadista', description: 'Impacto civilizatório', color: 'from-indigo-400 to-indigo-600' },
  'S8': { name: 'Visionário', description: 'Legado histórico', color: 'from-pink-400 to-pink-600' },
}

// Radar Chart Component (SVG)
function RadarChart({ strengths }: { strengths: StrengthData[] }) {
  const top5 = strengths.slice(0, 5)
  const centerX = 150
  const centerY = 150
  const maxRadius = 120

  // Create points for pentagon
  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    const radius = (value / 100) * maxRadius
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }

  // Background grid
  const gridLevels = [20, 40, 60, 80, 100]
  
  // Data points
  const dataPoints = top5.map((s, i) => getPoint(i, s.score))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <div className="relative">
      <svg viewBox="0 0 300 300" className="w-full max-w-[300px] mx-auto">
        {/* Background circles */}
        {gridLevels.map((level) => {
          const points = Array.from({ length: 5 }).map((_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          )
        })}

        {/* Axis lines */}
        {top5.map((_, i) => {
          const p = getPoint(i, 100)
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          )
        })}

        {/* Data area */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="rgb(236, 72, 153)" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <path
          d={dataPath}
          fill="url(#radarGradient)"
          stroke="rgb(168, 85, 247)"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={6}
            fill="white"
            stroke="rgb(168, 85, 247)"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {top5.map((s, i) => {
          const labelPoint = getPoint(i, 115)
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-current font-medium"
            >
              {s.code}
            </text>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {top5.map((s, i) => {
          const VirtueIcon = virtueIcons[s.virtue] || Sparkles
          return (
            <div key={i} className="flex items-center gap-1 text-xs">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${virtueColors[s.virtue] || 'from-gray-400 to-gray-500'}`} />
              <span className="text-gray-600">{s.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Achievement Badge Component
function AchievementBadge({ achievement, size = 'md' }: { achievement: Achievement; size?: 'sm' | 'md' | 'lg' }) {
  const unlocked = !!achievement.unlockedAt
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }
  
  const iconMap: Record<string, typeof Trophy> = {
    'first_assessment': Brain,
    'strengths_discovery': Gem,
    'first_plan': Target,
    'first_goal': Star,
    'streak_7': Flame,
    'streak_30': Zap,
    'all_categories': Crown,
    'growth': TrendingUp,
  }
  
  const Icon = iconMap[achievement.icon] || Trophy
  
  return (
    <div className="relative group">
      <div className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        ${unlocked 
          ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200' 
          : 'bg-gray-200'
        }
        transition-transform hover:scale-110
      `}>
        <Icon className={`${size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-7 w-7' : 'h-10 w-10'} ${unlocked ? 'text-white' : 'text-gray-400'}`} />
        {!unlocked && achievement.progress !== undefined && (
          <svg className="absolute inset-0" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${achievement.progress * 2.83} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className="text-purple-500"
            />
          </svg>
        )}
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded">
          {achievement.title}
        </div>
      </div>
    </div>
  )
}

export function IntegralProfile({ userId, patientId, compact = false }: IntegralProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      try {
        // Fetch stratum data
        const stratumRes = await fetch('/api/stratum/assessments?limit=1')
        const stratumData = stratumRes.ok ? await stratumRes.json() : []
        
        // Fetch strengths data  
        const strengthsRes = await fetch('/api/strengths/assessments?limit=1')
        const strengthsData = strengthsRes.ok ? await strengthsRes.json() : []
        
        // Fetch stats
        const statsRes = await fetch('/api/development/stats')
        const statsData = statsRes.ok ? await statsRes.json() : null
        
        // Build achievements
        const achievements: Achievement[] = [
          {
            id: 'first_assessment',
            title: 'Primeira Avaliação',
            description: 'Completou sua primeira avaliação de horizonte',
            icon: 'first_assessment',
            unlockedAt: stratumData.length > 0 ? stratumData[0].completedAt : undefined,
          },
          {
            id: 'strengths_discovery',
            title: 'Descoberta de Forças',
            description: 'Descobriu suas forças de caráter',
            icon: 'strengths_discovery',
            unlockedAt: strengthsData.length > 0 ? strengthsData[0].completedAt : undefined,
          },
          {
            id: 'first_plan',
            title: 'Primeiro Plano',
            description: 'Criou seu primeiro plano de desenvolvimento',
            icon: 'first_plan',
            unlockedAt: statsData?.plans?.active > 0 || statsData?.plans?.completed > 0 ? new Date().toISOString() : undefined,
          },
          {
            id: 'first_goal',
            title: 'Meta Alcançada',
            description: 'Completou sua primeira meta',
            icon: 'first_goal',
            unlockedAt: statsData?.goals?.completed > 0 ? new Date().toISOString() : undefined,
            progress: statsData?.goals?.completed === 0 ? (statsData?.goals?.inProgress / (statsData?.goals?.total || 1)) * 100 : undefined,
          },
          {
            id: 'streak_7',
            title: 'Semana Consistente',
            description: '7 dias seguidos de ações',
            icon: 'streak_7',
            unlockedAt: statsData?.streak?.current >= 7 ? new Date().toISOString() : undefined,
            progress: statsData?.streak?.current < 7 ? (statsData?.streak?.current / 7) * 100 : undefined,
          },
          {
            id: 'streak_30',
            title: 'Mês de Dedicação',
            description: '30 dias seguidos de ações',
            icon: 'streak_30',
            unlockedAt: statsData?.streak?.current >= 30 ? new Date().toISOString() : undefined,
            progress: statsData?.streak?.current < 30 ? (statsData?.streak?.current / 30) * 100 : undefined,
          },
        ]
        
        const latestStratum = stratumData[0]
        const latestStrengths = strengthsData[0]
        
        setProfile({
          stratum: latestStratum ? {
            level: latestStratum.calculatedStratum,
            timeSpanMonths: latestStratum.timeSpanMonths,
            completedAt: latestStratum.completedAt,
            confidence: latestStratum.confidence || 85,
          } : null,
          strengths: latestStrengths?.topStrengths?.map((s: any, i: number) => ({
            code: s.code,
            name: s.name,
            virtue: s.virtue,
            score: s.score,
            rank: i + 1,
          })) || [],
          plansCount: (statsData?.plans?.active || 0) + (statsData?.plans?.completed || 0),
          goalsCompleted: statsData?.goals?.completed || 0,
          totalGoals: statsData?.goals?.total || 0,
          currentStreak: statsData?.streak?.current || 0,
          longestStreak: statsData?.streak?.longest || 0,
          achievements,
          evolutionHistory: statsData?.stratum?.evolution || [],
        })
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [userId, patientId])

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-gray-200 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (!profile || (!profile.stratum && profile.strengths.length === 0)) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Comece sua Jornada</h3>
          <p className="text-gray-600 mb-6">
            Complete as avaliações para descobrir seu Perfil Integral
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" asChild>
              <a href="/development?tab=stratum">
                <Brain className="h-4 w-4 mr-2" />
                Horizonte Temporal
              </a>
            </Button>
            <Button asChild>
              <a href="/development?tab=strengths">
                <Gem className="h-4 w-4 mr-2" />
                Forças de Caráter
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-80">Perfil Integral</p>
                <p className="font-semibold">{profile.stratum?.level || 'Não avaliado'}</p>
              </div>
            </div>
            {profile.currentStreak > 0 && (
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                <Flame className="h-4 w-4 text-orange-300" />
                <span className="font-medium">{profile.currentStreak}</span>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            {profile.strengths.slice(0, 3).map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {s.code}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {profile.goalsCompleted}/{profile.totalGoals} metas
            </span>
            <Button size="sm" variant="ghost" asChild>
              <a href="/development">
                Ver mais <ChevronRight className="h-4 w-4 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const stratumInfo = profile.stratum ? stratumDescriptions[profile.stratum.level] : null

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="text-white">
                <h2 className="text-2xl md:text-3xl font-bold">Perfil Integral</h2>
                <p className="opacity-80">Seu mapa de desenvolvimento pessoal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {profile.currentStreak > 0 && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
                  <Flame className="h-5 w-5 text-orange-300" />
                  <div className="text-white">
                    <p className="text-2xl font-bold">{profile.currentStreak}</p>
                    <p className="text-xs opacity-80">dias seguidos</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button size="icon" variant="secondary" className="bg-white/20 hover:bg-white/30">
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
                <Button size="icon" variant="secondary" className="bg-white/20 hover:bg-white/30">
                  <Download className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stratum Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Horizonte Temporal
              </h3>
              {profile.stratum ? (
                <div className={`p-4 rounded-xl bg-gradient-to-br ${stratumInfo?.color || 'from-gray-400 to-gray-500'} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold">{profile.stratum.level}</span>
                    <Badge className="bg-white/20">{stratumInfo?.name}</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-3">{stratumInfo?.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {profile.stratum.timeSpanMonths < 12 
                        ? `${profile.stratum.timeSpanMonths} meses`
                        : `${Math.round(profile.stratum.timeSpanMonths / 12)} anos`
                      } de visão
                    </span>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <a href="/development?tab=stratum">
                    Avaliar Horizonte
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>

            {/* Strengths Radar */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Gem className="h-5 w-5 text-purple-600" />
                Forças de Caráter
              </h3>
              {profile.strengths.length > 0 ? (
                <RadarChart strengths={profile.strengths} />
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <a href="/development?tab=strengths">
                    Descobrir Forças
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              )}
            </div>

            {/* Progress Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Progresso
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Metas Completadas</span>
                    <span className="font-semibold">{profile.goalsCompleted}/{profile.totalGoals}</span>
                  </div>
                  <Progress 
                    value={profile.totalGoals > 0 ? (profile.goalsCompleted / profile.totalGoals) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Planos Ativos</span>
                    <span className="font-semibold">{profile.plansCount}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Maior Sequência</span>
                    <div className="flex items-center gap-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="font-semibold">{profile.longestStreak} dias</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Conquistas
          </CardTitle>
          <CardDescription>
            Desbloqueie badges ao progredir em sua jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-8 py-4">
            {profile.achievements.map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Strengths Detail */}
      {profile.strengths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Suas Gemas Brutas
            </CardTitle>
            <CardDescription>
              Forças naturais que você pode usar para alcançar seus objetivos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.strengths.slice(0, 5).map((strength, index) => {
                const Icon = virtueIcons[strength.virtue] || Sparkles
                return (
                  <div 
                    key={index}
                    className="relative p-4 rounded-xl border bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all"
                  >
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      #{strength.rank}
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${virtueColors[strength.virtue]} flex items-center justify-center mb-3`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-semibold mb-1">{strength.name}</h4>
                    <Badge variant="outline" className="text-xs">{strength.virtue}</Badge>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">Intensidade</span>
                        <span className="font-medium">{strength.score}%</span>
                      </div>
                      <Progress value={strength.score} className="h-1.5" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      {profile.plansCount === 0 && (
        <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <Target className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-semibold text-lg mb-1">
                  Pronto para criar seu Plano de Desenvolvimento?
                </h3>
                <p className="text-gray-600">
                  Use suas forças para criar metas alinhadas com quem você realmente é.
                </p>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                <a href="/development?tab=plan">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Criar Plano
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
