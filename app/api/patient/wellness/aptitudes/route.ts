import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

/**
 * GET /api/patient/wellness/aptitudes
 * 
 * Returns discovered patient aptitudes (strengths)
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

    const aptitudes = await prisma.patientAptitude.findMany({
      where: { patientId: user.patient.id },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: aptitudes,
    });
  } catch (error) {
    logger.error("Error fetching aptitudes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
