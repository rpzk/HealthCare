import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = (await auth()) as (Session & { user: { id: string } }) | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get patient ID from session
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true },
    });

    if (!user?.patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    const patientId = user.patient.id;

    // Get latest mood log
    const latestMood = await prisma.patientMoodLog.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    // Get latest wellness score
    const latestWellnessScore = await prisma.patientWellnessScore.findFirst({
      where: { patientId },
      orderBy: { calculatedAt: "desc" },
    });

    // Get yesterday's wellness score for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayScore = await prisma.patientWellnessScore.findFirst({
      where: {
        patientId,
        calculatedAt: {
          gte: yesterday,
          lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { calculatedAt: "desc" },
    });

    // Calculate score change
    const currentScore = latestWellnessScore?.score || 0;
    const previousScore = yesterdayScore?.score || currentScore;
    const scoreChange = currentScore - previousScore;
    const scoreChangePercentage = previousScore > 0
      ? ((scoreChange / previousScore) * 100).toFixed(1)
      : "0.0";

    // Determine trend
    let trend: "up" | "down" | "stable" = "stable";
    if (scoreChange > 2) trend = "up";
    else if (scoreChange < -2) trend = "down";

    // Generate motivational message based on mood
    const motivationalMessages: Record<number, string> = {
      1: "Você está passando por um momento difícil. Respire fundo, um passo de cada vez. 💙",
      2: "Dia normal. Pequenos passos levam a grandes resultados! 👣",
      3: "Você está bem! Continue assim! 😊",
      4: "Ótimo dia! Sua dedicação está funcionando! 🌟",
      5: "Extraordinário! Você é uma inspiração! ✨",
    };

    const mood = latestMood?.mood || 0;
    const motivationalMessage = mood > 0 ? motivationalMessages[mood] || motivationalMessages[3] : null;

    // Build response
    const response = {
      success: true,
      data: {
        patientName: user.patient.name,
        mood: mood > 0 ? mood : null,
        wellnessScore: currentScore > 0 ? Math.round(currentScore) : null,
        scoreChange: currentScore > 0 ? Number(scoreChange.toFixed(1)) : null,
        scoreChangePercentage: currentScore > 0 ? Number(scoreChangePercentage) : null,
        motivationalMessage,
        trend: currentScore > 0 ? trend : null,
        lastMoodUpdate: latestMood?.createdAt || null,
        lastScoreUpdate: latestWellnessScore?.calculatedAt || null,
        components: currentScore > 0 ? {
          mood: latestWellnessScore?.moodComponent || 0,
          adherence: latestWellnessScore?.adherenceComponent || 0,
          vitals: latestWellnessScore?.vitalComponent || 0,
          emotional: latestWellnessScore?.emotionalComponent || 0,
        } : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error fetching wellness state:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
