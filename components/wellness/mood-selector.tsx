"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MoodSelectorProps {
  onMoodSelected?: (mood: number) => void;
  isLoading?: boolean;
}

export function MoodSelector({ onMoodSelected, isLoading = false }: MoodSelectorProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const moods = [
    { level: 1, emoji: "😢", label: "Muito ruim" },
    { level: 2, emoji: "😐", label: "Ruim" },
    { level: 3, emoji: "🙂", label: "Normal" },
    { level: 4, emoji: "😊", label: "Bom" },
    { level: 5, emoji: "🤗", label: "Excelente" },
  ];

  const handleMoodSelect = async (mood: number) => {
    setSelectedMood(mood);

    startTransition(async () => {
      try {
        const response = await fetch("/api/patient/wellness/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao registrar humor");
        }

        const data = await response.json();
        toast.success("Humor registrado! 🎉");
        onMoodSelected?.(mood);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        toast.error(message);
        setSelectedMood(null);
      }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Como você está se sentindo agora?
      </p>
      <div className="flex gap-2">
        {moods.map(({ level, emoji, label }) => (
          <Button
            key={level}
            onClick={() => handleMoodSelect(level)}
            disabled={isPending || isLoading}
            variant={selectedMood === level ? "default" : "outline"}
            size="sm"
            title={label}
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
      {isPending && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Registrando...
        </p>
      )}
    </div>
  );
}
