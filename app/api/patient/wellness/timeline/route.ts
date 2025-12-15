import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * GET /api/patient/wellness/timeline
 * 
 * Returns patient health timeline with integrated events showing causalité
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

    // Get limit from query params (default 20)
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 20;

    const events = await prisma.patientHealthEvent.findMany({
      where: { patientId: user.patient.id },
      orderBy: { eventDate: "desc" },
      take: limit,
    });

    // Group events by date for better visualization
    const groupedByDate: Record<string, typeof events> = {};
    
    events.forEach((event) => {
      const dateKey = event.eventDate.toISOString().split("T")[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(event);
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        groupedByDate,
        totalEvents: events.length,
      },
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
