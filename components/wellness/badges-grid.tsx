"use client";

import React from "react";
import { Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Badge {
  id: string;
  name: string;
  icon: string;
  description?: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  progress: number;
  unlockedAt?: string | null;
}

interface BadgesGridProps {
  badges: Badge[];
  isLoading?: boolean;
}

export function BadgesGrid({ badges, isLoading = false }: BadgesGridProps) {
  const rarityConfig = {
    COMMON: { bg: "bg-gray-100 dark:bg-gray-800", border: "border-gray-300 dark:border-gray-600", color: "text-gray-700" },
    RARE: { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", color: "text-blue-700" },
    EPIC: { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", color: "text-purple-700" },
    LEGENDARY: { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", color: "text-amber-700" },
  };

  const emojiMap: Record<string, string> = {
    sprout: "🌱",
    star: "⭐",
    trophy: "🏆",
    flame: "🔥",
    heart: "❤️",
    shield: "🛡️",
    crown: "👑",
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-neutral-600 dark:text-neutral-400">
        <p className="text-sm">Selos serão desbloqueados conforme você avança</p>
      </div>
    );
  }

  const unlockedBadges = badges.filter((b) => b.unlockedAt);
  const lockedBadges = badges.filter((b) => !b.unlockedAt);

  return (
    <div className="space-y-6">
      {unlockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">
            Desbloqueados ({unlockedBadges.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {unlockedBadges.map((badge) => {
              const config = rarityConfig[badge.rarity];
              const emoji = emojiMap[badge.icon] || "🎯";

              return (
                <div
                  key={badge.id}
                  className={`rounded-lg border p-4 ${config.bg} ${config.border} text-center`}
                >
                  <div className="text-4xl mb-2">{emoji}</div>
                  <h5 className={`font-bold text-sm ${config.color} mb-1`}>{badge.name}</h5>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {badge.description}
                  </p>
                  <p className="text-xs font-medium mt-2 text-neutral-500">
                    {badge.rarity.toLowerCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">
            Em Progresso ({lockedBadges.length})
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lockedBadges.map((badge) => {
              const config = rarityConfig[badge.rarity];

              return (
                <div
                  key={badge.id}
                  className={`rounded-lg border p-4 opacity-60 ${config.bg} ${config.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Lock className="h-4 w-4 text-neutral-400" />
                    <span className="text-xs font-medium text-neutral-500">
                      {Math.round(badge.progress)}%
                    </span>
                  </div>
                  <h5 className={`font-bold text-sm ${config.color} mb-2`}>{badge.name}</h5>
                  <Progress value={badge.progress} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
