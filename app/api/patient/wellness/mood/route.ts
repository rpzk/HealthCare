import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * Calculate wellness score from mood components
 * Formula: Weighted average adjusted by stress
 */
function calculateWellnessScore(
  mood: number,
  energy: number,
  stress: number,
  sleep: number
): number {
  // Base score from positive factors (0-60)
  const baseScore = ((mood + energy + sleep) / 3 / 5) * 60;
  
  // Stress adjustment (0-40)
  const stressAdjustment = ((5 - stress) / 5) * 40;
  
  return Math.min(100, Math.max(0, baseScore + stressAdjustment));
}

export async function POST(req: NextRequest) {
  try {
    const session = (await auth()) as (Session & { user: { id: string } }) | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { mood, energy, stress, sleep, notes } = body;

    // Validation
    if (!mood || mood < 1 || mood > 5) {
      return NextResponse.json(
        { error: "Invalid mood value (must be 1-5)" },
        { status: 400 }
      );
    }

    // Get patient ID
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

    // Create mood log
    const moodLog = await prisma.patientMoodLog.create({
      data: {
        patientId,
        mood: Number(mood),
        energy: energy ? Number(energy) : mood,
        stress: stress ? Number(stress) : Math.max(1, 6 - mood),
        sleep: sleep ? Number(sleep) : 4,
        notes: notes || null,
      },
    });

    // Calculate new wellness score
    const wellnessScore = calculateWellnessScore(
      Number(mood),
      energy ? Number(energy) : mood,
      stress ? Number(stress) : Math.max(1, 6 - mood),
      sleep ? Number(sleep) : 4
    );

    // Create wellness score record
    await prisma.patientWellnessScore.create({
      data: {
        patientId,
        score: wellnessScore,
        moodComponent: (mood / 5) * 25,
        adherenceComponent: 25,
        vitalComponent: 25,
        emotionalComponent: (energy ? Number(energy) : mood) / 5 * 25,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        moodLog,
        wellnessScore: Math.round(wellnessScore),
        message: "Mood registrado com sucesso! 🎉",
      },
    });
  } catch (error) {
    console.error("Error recording mood:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

}
