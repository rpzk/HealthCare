"use client";

import React from "react";
import { Flame, Heart, Shield, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Aptitude {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  score: number;
  discoveredAt: string;
}

interface AptitudesGridProps {
  aptitudes: Aptitude[];
  isLoading?: boolean;
}

export function AptitudesGrid({ aptitudes, isLoading = false }: AptitudesGridProps) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    heart: Heart,
    flame: Flame,
    shield: Shield,
    zap: Zap,
  };

  const categoryColors: Record<string, string> = {
    health: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
    behavior: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    emotional: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900",
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!aptitudes || aptitudes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-neutral-600 dark:text-neutral-400">
        <p className="text-sm">Aptidões serão descobertas ao longo do tempo</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {aptitudes.map((apt) => {
        const Icon = iconMap[apt.icon] || Flame;
        const bgColor = categoryColors[apt.category] || categoryColors.health;

        return (
          <div
            key={apt.id}
            className={`rounded-lg border p-4 ${bgColor} transition-all hover:shadow-md`}
          >
            <div className="flex items-start gap-3 mb-2">
              <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                {apt.name}
              </h4>
            </div>
            <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-3">
              {apt.description}
            </p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {apt.score.toFixed(0)}%
                </span>
              </div>
              <Progress value={apt.score} className="h-1.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
