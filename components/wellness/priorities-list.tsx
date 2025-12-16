"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Clock, Pill, Calendar, Zap } from "lucide-react";

interface Priority {
  type: "medication" | "appointment" | "goal" | "exam";
  priority: number;
  title: string;
  description: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  progress?: number;
}

interface PrioritiesListProps {
  priorities: Priority[];
  isLoading?: boolean;
}

export function PrioritiesList({ priorities, isLoading = false }: PrioritiesListProps) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    pill: Pill,
    calendar: Calendar,
    target: Zap,
    "test-tube": Clock,
  };

  const urgencyConfig = {
    HIGH: { color: "bg-red-50 border-red-200 dark:bg-red-950/30", label: "Urgente" },
    MEDIUM: { color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30", label: "Importante" },
    LOW: { color: "bg-green-50 border-green-200 dark:bg-green-950/30", label: "Normal" },
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!priorities || priorities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-neutral-600 dark:text-neutral-400">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma ação pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {priorities.slice(0, 5).map((item, idx) => {
        const Icon = icons[item.icon] || Clock;
        const config = urgencyConfig[item.urgency];

        return (
          <div
            key={idx}
            className={`rounded-lg border p-4 transition-all hover:shadow-md ${config.color}`}
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400 mt-0.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </h4>
                  <span className="flex-shrink-0 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/50 dark:bg-neutral-800/50">
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {item.description}
                </p>
                {item.progress !== undefined && (
                  <div className="mt-2 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-violet-600"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
