import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * GET /api/patient/wellness/badges
 * 
 * Returns patient badges with rarity levels and progress
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await auth()) as (Session & { user: { id: string } }) | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const badges = await prisma.patientBadge.findMany({
      where: { patientId: user.patient.id },
      orderBy: [
        { unlockedAt: { sort: "desc", nulls: "last" } },
        { rarity: "desc" },
      ],
    });

    // Separate unlocked and locked badges
    const unlocked = badges.filter((b) => b.unlockedAt !== null);
    const inProgress = badges.filter((b) => b.unlockedAt === null);

    return NextResponse.json({
      success: true,
      data: {
        all: badges,
        unlocked,
        inProgress,
        stats: {
          total: badges.length,
          unlocked: unlocked.length,
          inProgress: inProgress.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
