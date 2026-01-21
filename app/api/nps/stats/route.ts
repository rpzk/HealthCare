/**
 * API para obter estatísticas de NPS
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic'
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NpsService } from "@/lib/nps-service";
import type { Session } from "next-auth";
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as (Session & { user: { id: string; role?: string } }) | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const periodInDays = parseInt(searchParams.get("periodInDays") || "30", 10);

    const isAuthorized =
      session.user.role === "ADMIN" ||
      session.user.role === "MANAGER" ||
      (doctorId && session.user.id === doctorId);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const now = new Date();
    const startCurrent = new Date(now);
    startCurrent.setDate(startCurrent.getDate() - periodInDays);

    const startPrevious = new Date(startCurrent);
    startPrevious.setDate(startPrevious.getDate() - periodInDays);

    const baseWhere: any = { score: { gte: 0 } };
    if (doctorId) baseWhere.doctorId = doctorId;

    const currentWhere = { ...baseWhere, respondedAt: { gte: startCurrent } };
    const previousWhere = { ...baseWhere, respondedAt: { gte: startPrevious, lt: startCurrent } };

    const [currentResponses, previousResponses] = await Promise.all([
      prisma.npsResponse.findMany({
        where: currentWhere,
        select: {
          score: true,
          category: true,
          sentiment: true,
          feedback: true,
          tags: true,
          createdAt: true,
          patient: { select: { name: true } },
          id: true,
        },
      }),
      prisma.npsResponse.findMany({
        where: previousWhere,
        select: { category: true, score: true },
      }),
    ]);

    const totalResponses = currentResponses.length;
    const promoters = currentResponses.filter((r) => r.category === "PROMOTER").length;
    const passives = currentResponses.filter((r) => r.category === "PASSIVE").length;
    const detractors = currentResponses.filter((r) => r.category === "DETRACTOR").length;

    const npsScore = totalResponses
      ? Math.round(((promoters - detractors) / totalResponses) * 100)
      : 0;

    const avgScore = totalResponses
      ? currentResponses.reduce((sum, r) => sum + r.score, 0) / totalResponses
      : 0;

    const previousPromoters = previousResponses.filter((r) => r.category === "PROMOTER").length;
    const previousDetractors = previousResponses.filter((r) => r.category === "DETRACTOR").length;
    const previousTotal = previousResponses.length;
    const previousNps = previousTotal
      ? Math.round(((previousPromoters - previousDetractors) / previousTotal) * 100)
      : 0;

    const tagCounts: Record<string, number> = {};
    currentResponses.forEach((r) => {
      r.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    const recentDetractors = currentResponses
      .filter((r) => r.category === "DETRACTOR")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        patientName: r.patient?.name ?? "Paciente",
        score: r.score,
        feedback: r.feedback ?? "",
        createdAt: r.createdAt,
      }));

    const responseRate = totalResponses > 0 ? 100 : 0; // Sem tracking de envios, assume 100% das respostas coletadas

    return NextResponse.json({
      npsScore,
      totalResponses,
      responseRate,
      avgScore,
      distribution: {
        promoters,
        passives,
        detractors,
      },
      trend: {
        current: npsScore,
        previous: previousNps,
        change: npsScore - previousNps,
      },
      topTags,
      recentDetractors,
    });
  } catch (error: any) {
    logger.error("Erro ao obter estatísticas NPS:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao obter estatísticas" },
      { status: 500 }
    );
  }
}
