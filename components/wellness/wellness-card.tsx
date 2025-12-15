"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WellnessCardProps {
  mood?: number | null;
  wellnessScore?: number | null;
  scoreChange?: number | null;
  scoreChangePercentage?: number | null;
  trend?: "up" | "down" | "stable" | null;
  motivationalMessage?: string | null;
  lastUpdated?: string | null;
  isLoading?: boolean;
}

export function WellnessCard({
  mood,
  wellnessScore,
  scoreChange = 0,
  scoreChangePercentage = 0,
  trend = "stable",
  motivationalMessage,
  lastUpdated,
  isLoading = false,
}: WellnessCardProps) {
  const moodEmojis: Record<number, string> = {
    1: "😢",
    2: "😐",
    3: "🙂",
    4: "😊",
    5: "🤗",
  };

  const trendIcon = {
    up: <TrendingUp className="h-5 w-5 text-green-500" />,
    down: <TrendingDown className="h-5 w-5 text-red-500" />,
    stable: <Minus className="h-5 w-5 text-gray-400" />,
  };

  const getTrendLabel = (t: string | null | undefined) => {
    if (t === "up") return "Melhorando";
    if (t === "down") return "Baixando";
    return "Estável";
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white/70 p-6 shadow-sm dark:bg-neutral-900/70 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 rounded dark:bg-gray-700 mb-4" />
        <div className="h-12 w-48 bg-gray-200 rounded dark:bg-gray-700 mb-4" />
        <div className="h-3 w-full bg-gray-200 rounded dark:bg-gray-700" />
      </div>
    );
  }

  const scorePercentage = wellnessScore ?? 0;
  const moodEmoji = mood ? moodEmojis[mood] : "—";

  return (
    <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm dark:from-violet-950/30 dark:to-neutral-900/70">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
            Estado Pessoal
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl">{moodEmoji}</span>
            <div>
              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">
                {wellnessScore ?? "—"}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Score de bem-estar
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/50 dark:bg-neutral-800/50">
          {trendIcon[trend as keyof typeof trendIcon]}
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {getTrendLabel(trend)}
          </span>
        </div>
      </div>

      {wellnessScore !== null && wellnessScore !== undefined && wellnessScore > 0 && (
        <>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Progresso
              </span>
              <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                {scoreChangePercentage !== null && scoreChangePercentage > 0
                  ? `+${scoreChangePercentage}%`
                  : scoreChangePercentage !== null && scoreChangePercentage < 0
                    ? `${scoreChangePercentage}%`
                    : "—"}
              </span>
            </div>
            <Progress value={scorePercentage} className="h-2" />
          </div>
        </>
      )}

      {motivationalMessage && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 italic border-l-2 border-violet-300 pl-3">
          {motivationalMessage}
        </p>
      )}

      {lastUpdated && (
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
          Atualizado:{" "}
          {new Date(lastUpdated).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
