"use client";

import React from "react";
import { Heart, Pill, FileText, Zap, Target, Calendar } from "lucide-react";

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  type: "VITAL" | "MEDICATION" | "CONSULTATION" | "EXAM" | "MILESTONE" | "APPOINTMENT" | "DIAGNOSIS" | "TREATMENT";
  eventDate: string;
  impact?: string;
  causalite?: string;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  isLoading?: boolean;
}

export function TimelineView({ events, isLoading = false }: TimelineViewProps) {
  const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    VITAL: { icon: Heart, color: "text-red-500" },
    MEDICATION: { icon: Pill, color: "text-blue-500" },
    CONSULTATION: { icon: FileText, color: "text-purple-500" },
    EXAM: { icon: Zap, color: "text-yellow-500" },
    MILESTONE: { icon: Target, color: "text-green-500" },
    APPOINTMENT: { icon: Calendar, color: "text-cyan-500" },
    DIAGNOSIS: { icon: FileText, color: "text-orange-500" },
    TREATMENT: { icon: Heart, color: "text-pink-500" },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-neutral-600 dark:text-neutral-400">
        <p className="text-sm">Nenhum evento na timeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.slice(0, 10).map((event, idx) => {
        const config = typeConfig[event.type] || typeConfig.VITAL;
        const Icon = config.icon;
        const eventDateObj = new Date(event.eventDate);
        const isToday = eventDateObj.toDateString() === new Date().toDateString();
        const formattedDate = eventDateObj.toLocaleDateString("pt-BR", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={event.id} className="relative pl-8">
            {/* Timeline line */}
            {idx < events.length - 1 && (
              <div className="absolute left-2 top-8 h-6 w-0.5 bg-neutral-200 dark:bg-neutral-700" />
            )}

            {/* Timeline dot */}
            <div className={`absolute left-0 top-1.5 h-5 w-5 rounded-full border-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 flex items-center justify-center`}>
              <Icon className={`h-3 w-3 ${config.color}`} />
            </div>

            {/* Event card */}
            <div className="rounded-lg border bg-white/50 dark:bg-neutral-800/50 p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                  {event.title}
                </h4>
                <span className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                  isToday
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                }`}>
                  {isToday ? "Hoje" : formattedDate}
                </span>
              </div>

              {event.description && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                  {event.description}
                </p>
              )}

              {event.impact && (
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">
                  <span className="font-medium">Impacto:</span> {event.impact}
                </p>
              )}

              {event.causalite && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 italic border-l-2 border-neutral-300 dark:border-neutral-600 pl-2">
                  {event.causalite}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
