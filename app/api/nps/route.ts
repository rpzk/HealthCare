/**
 * API para submeter e consultar respostas NPS
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NpsService } from "@/lib/nps-service";
import { logger } from "@/lib/logger";
import type { Session } from "next-auth";

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = (await auth()) as (Session & { user: { id: string; role?: string } }) | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { consultationId, score, feedback, wouldRecommend } = body;

    if (!consultationId || score === undefined) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (score < 0 || score > 10) {
      return NextResponse.json({ error: "Score deve estar entre 0 e 10" }, { status: 400 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        doctor: { select: { name: true } },
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: "Consulta não encontrada" }, { status: 404 });
    }

    if (consultation.patientId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado para esta consulta" }, { status: 403 });
    }

    const result = await NpsService.submitResponse({
      consultationId,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      score,
      feedback,
      wouldRecommend,
    });

    return NextResponse.json({
      success: true,
      response: result,
      doctorName: consultation.doctor?.name ?? null,
    });
  } catch (error) {
    logger.error("Erro ao submeter NPS", error as Error);
    return NextResponse.json(
      { error: (error as any)?.message || "Erro ao submeter resposta" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = (await auth()) as (Session & { user: { id: string; role?: string } }) | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const consultationId = searchParams.get("consultationId");

    if (!consultationId) {
      return NextResponse.json({ error: "consultationId obrigatório" }, { status: 400 });
    }

    const response = await NpsService.getResponseByConsultation(consultationId);

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    logger.error("Erro ao consultar NPS", error as Error);
    return NextResponse.json(
      { error: (error as any)?.message || "Erro ao consultar NPS" },
      { status: 500 }
    );
  }
}
