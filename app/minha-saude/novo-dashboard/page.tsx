"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { WellnessCard } from "@/components/wellness/wellness-card";
import { MoodSelector } from "@/components/wellness/mood-selector";
import { PrioritiesList } from "@/components/wellness/priorities-list";
import { TimelineView } from "@/components/wellness/timeline-view";
import { AptitudesGrid } from "@/components/wellness/aptitudes-grid";
import { BadgesGrid } from "@/components/wellness/badges-grid";
import { Heart, Target, Clock, Star, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface WellnessState {
  patientName: string | null;
  mood: number | null;
  wellnessScore: number | null;
  scoreChange: number | null;
  scoreChangePercentage: number | null;
  motivationalMessage: string | null;
  trend: "up" | "down" | "stable" | null;
  lastMoodUpdate: string | null;
  lastScoreUpdate: string | null;
  components: {
    mood: number;
    adherence: number;
    vitals: number;
    emotional: number;
  } | null;
}

interface Priority {
  type: "medication" | "appointment" | "goal" | "exam";
  priority: number;
  title: string;
  description: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  progress?: number;
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  type: "VITAL" | "MEDICATION" | "CONSULTATION" | "EXAM" | "MILESTONE" | "APPOINTMENT" | "DIAGNOSIS" | "TREATMENT";
  eventDate: string;
  impact?: string;
  causalite?: string;
}

interface Aptitude {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  score: number;
  discoveredAt: string;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description?: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  progress: number;
  unlockedAt?: string | null;
}

interface DevelopmentPlan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  targetDate: string;
  currentPhase: number;
  progress: number;
  status: string;
  phases: Array<{
    phase: number;
    title: string;
    goals: string[];
    completed: boolean;
    current?: boolean;
  }>;
}

export default function NovoDashboardPage() {
  const { data: session, status } = useSession();
  const [wellnessState, setWellnessState] = useState<WellnessState | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [developmentPlan, setDevelopmentPlan] = useState<DevelopmentPlan | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [aptitudes, setAptitudes] = useState<Aptitude[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }

  const fetchData = useCallback(async (showToast = false) => {
    if (!showToast) setLoading(true);
    if (showToast) setIsRefreshing(true);

    try {
      const stateRes = await fetch("/api/patient/wellness/state");
      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setWellnessState(stateData.data);
        if (showToast && wellnessState?.wellnessScore !== stateData.data.wellnessScore) {
          toast.success("Score atualizado! 📊");
        }
      }

      const prioritiesRes = await fetch("/api/patient/wellness/priorities");
      if (prioritiesRes.ok) {
        const prioritiesData = await prioritiesRes.json();
        setPriorities(prioritiesData.data.priorities || []);
      }

      const timelineRes = await fetch("/api/patient/wellness/timeline");
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setTimelineEvents(timelineData.data.events || []);
      }

      const aptitudesRes = await fetch("/api/patient/wellness/aptitudes");
      if (aptitudesRes.ok) {
        const aptitudesData = await aptitudesRes.json();
        setAptitudes(aptitudesData.data || []);
      }

      const badgesRes = await fetch("/api/patient/wellness/badges");
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json();
        setBadges(badgesData.data.all || []);
        if (showToast && badgesData.data.all?.some((b: Badge) => b.unlockedAt && new Date(b.unlockedAt) > (lastUpdate || new Date()))) {
          toast.success("Novo selo desbloqueado! 🏆");
        }
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching wellness data:", error);
      if (showToast) toast.error("Erro ao atualizar dados");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [lastUpdate, wellnessState?.wellnessScore]);

  // Initial load
  useEffect(() => {
    if (status === "authenticated") {
      void fetchData();
    }
  }, [fetchData, status]);

  // Auto-refetch every 5 minutes
  useEffect(() => {
    if (status !== "authenticated") return;

    const interval = setInterval(() => {
      void fetchData(true);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchData, status]);

  const today = new Date();
  const greeting = (() => {
    const hour = today.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const handleManualRefresh = async () => {
    await fetchData(true);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header with Refresh Button */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {greeting}, {wellnessState?.patientName || "Paciente"}! 👋
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {today.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/70 dark:bg-neutral-800/70 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="text-sm">Atualizar</span>
          </button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Atualizado: {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <WellnessCard
            mood={wellnessState?.mood}
            wellnessScore={wellnessState?.wellnessScore}
            scoreChange={wellnessState?.scoreChange}
            scoreChangePercentage={wellnessState?.scoreChangePercentage}
            trend={wellnessState?.trend}
            motivationalMessage={wellnessState?.motivationalMessage}
            lastUpdated={wellnessState?.lastMoodUpdate}
            isLoading={loading}
          />

          {/* Development Plan Card */}
          <Card className="border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-neutral-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Seu Plano de Desenvolvimento
              </CardTitle>
              <CardDescription>Progresso de saúde personalizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {developmentPlan ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {developmentPlan.title}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {developmentPlan.description}
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">
                        {Math.round(developmentPlan.progress)}%
                      </span>
                    </div>
                    <Progress value={developmentPlan.progress} className="h-3" />
                  </div>

                  {/* Phases */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Fases do Plano
                    </p>
                    {developmentPlan.phases?.map((phase) => (
                      <div
                        key={phase.phase}
                        className={`rounded-lg p-3 ${
                          phase.current
                            ? "bg-blue-100 dark:bg-blue-900/40 border border-blue-300"
                            : phase.completed
                              ? "bg-green-100 dark:bg-green-900/40 border border-green-300"
                              : "bg-gray-100 dark:bg-gray-800 border border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">
                            Fase {phase.phase}: {phase.title}
                          </h4>
                          <span className="text-xs font-bold px-2 py-1 rounded-full bg-white dark:bg-gray-900">
                            {phase.current ? "📍 Atual" : phase.completed ? "✅ Concluída" : "⏳ Pendente"}
                          </span>
                        </div>
                        <ul className="text-xs space-y-1 text-neutral-700 dark:text-neutral-300">
                          {phase.goals?.map((goal, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span>{phase.completed ? "✓" : "•"}</span>
                              <span>{goal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-neutral-600 dark:text-neutral-400">
                  <p className="text-sm">Nenhum plano de desenvolvimento ativo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Actions Card */}
          <Card className="border bg-white/70 dark:bg-neutral-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-violet-600" />
                Ações de Hoje
              </CardTitle>
              <CardDescription>Top 5 prioridades para hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <PrioritiesList priorities={priorities} isLoading={loading} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border bg-white/70 dark:bg-neutral-900/70">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                Como você está?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MoodSelector onMoodSelected={() => fetchData(true)} isLoading={loading} />
            </CardContent>
          </Card>

          {wellnessState?.components && (
            <Card className="border bg-white/70 dark:bg-neutral-900/70">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Componentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Humor</span>
                  <span className="font-bold">{wellnessState.components.mood.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Adesão</span>
                  <span className="font-bold">{wellnessState.components.adherence.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitais</span>
                  <span className="font-bold">{wellnessState.components.vitals.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Emocional</span>
                  <span className="font-bold">{wellnessState.components.emotional.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="aptitudes" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Aptidões</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Selos</span>
          </TabsTrigger>
        </TabsList>

        {lastUpdate && (
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Dados atualizados às {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        <TabsContent value="timeline">
          <Card className="border bg-white/70 dark:bg-neutral-900/70">
            <CardHeader>
              <CardTitle>Timeline de Saúde</CardTitle>
              <CardDescription>Histórico de eventos e marcos</CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineView events={timelineEvents} isLoading={loading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aptitudes">
          <Card className="border bg-white/70 dark:bg-neutral-900/70">
            <CardHeader>
              <CardTitle>Suas Aptidões</CardTitle>
              <CardDescription>Forças e capacidades descobertas</CardDescription>
            </CardHeader>
            <CardContent>
              <AptitudesGrid aptitudes={aptitudes} isLoading={loading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges">
          <Card className="border bg-white/70 dark:bg-neutral-900/70">
            <CardHeader>
              <CardTitle>Selos de Conquista</CardTitle>
              <CardDescription>Marcos e realizações</CardDescription>
            </CardHeader>
            <CardContent>
              <BadgesGrid badges={badges} isLoading={loading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
