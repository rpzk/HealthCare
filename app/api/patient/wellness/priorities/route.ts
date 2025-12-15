import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

type Priority = {
  type: "medication" | "appointment" | "goal" | "exam";
  priority: number;
  title: string;
  description: string;
  time?: string | Date;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  icon: string;
  progress?: number;
  actions: Array<{
    label: string;
    action: string;
    variant?: "default" | "outline" | "destructive";
  }>;
  metadata?: Record<string, any>;
};

/**
 * GET /api/patient/wellness/priorities
 * 
 * Returns smart-ranked daily priorities for the patient
 * Ranking: medications > appointments (next 7 days) > goals
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

    const patientId = user.patient.id;
    const priorities: Priority[] = [];
    let priorityCounter = 1;

    // 1. TODAY'S MEDICATIONS (Highest priority)
    const medications = await prisma.prescription.findMany({
      where: {
        patientId,
        status: "ACTIVE",
      },
      take: 3,
      orderBy: { createdAt: "desc" },
    });

    for (const med of medications) {
      priorities.push({
        type: "medication",
        priority: priorityCounter++,
        title: `💊 ${med.medication || "Medicamento"}`,
        description: `Tomar conforme prescrito${med.dosage ? ` - ${med.dosage}` : ""}`,
        urgency: "HIGH",
        icon: "pill",
        actions: [
          { label: "✓ Já tomei", action: "complete", variant: "default" },
          { label: "⏰ Lembrar depois", action: "snooze", variant: "outline" },
        ],
        metadata: { prescriptionId: med.id },
      });
    }

    // 2. UPCOMING APPOINTMENTS (Next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const appointments = await prisma.consultation.findMany({
      where: {
        patientId,
        scheduledDate: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
        status: { not: "CANCELLED" },
      },
      include: {
        doctor: {
          select: { name: true, speciality: true },
        },
      },
      take: 3,
      orderBy: { scheduledDate: "asc" },
    });

    for (const apt of appointments) {
      const daysUntil = Math.floor(
        (apt.scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const isToday = daysUntil === 0;
      const urgency = isToday ? "HIGH" : daysUntil <= 2 ? "MEDIUM" : "LOW";

      priorities.push({
        type: "appointment",
        priority: priorityCounter++,
        title: `🏥 Consulta com ${apt.doctor.name}`,
        description: `${apt.scheduledDate.toLocaleDateString("pt-BR")} às ${apt.scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${apt.doctor.speciality ? ` - ${apt.doctor.speciality}` : ""}`,
        time: apt.scheduledDate,
        urgency,
        icon: "calendar",
        actions: [
          { label: "Confirmar", action: "confirm", variant: "default" },
          { label: "Reagendar", action: "reschedule", variant: "outline" },
        ],
        metadata: { appointmentId: apt.id, daysUntil },
      });
    }

    // 3. PENDING EXAM REQUESTS
    const examRequests = await prisma.examRequest.findMany({
      where: {
        patientId,
        status: {
          in: ["REQUESTED", "SCHEDULED"],
        },
      },
      take: 2,
      orderBy: { createdAt: "desc" },
    });

    for (const exam of examRequests) {
      priorities.push({
        type: "exam",
        priority: priorityCounter++,
        title: `🔬 Realizar exame: ${exam.examType}`,
        description: exam.notes || "Exame solicitado pelo médico",
        urgency: "MEDIUM",
        icon: "test-tube",
        actions: [
          { label: "Agendar", action: "schedule", variant: "default" },
          { label: "Ver detalhes", action: "view", variant: "outline" },
        ],
        metadata: { examRequestId: exam.id },
      });
    }

    // 4. PERSONAL HEALTH GOALS (from development plan)
    const activePlan = await prisma.patientDevelopmentPlan.findFirst({
      where: {
        patientId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (activePlan && activePlan.phases) {
      const phases = activePlan.phases as any[];
      const currentPhase = phases.find((p) => p.current);
      
      if (currentPhase && currentPhase.goals) {
        const todayGoal = currentPhase.goals[0]; // First incomplete goal
        
        if (todayGoal) {
          priorities.push({
            type: "goal",
            priority: priorityCounter++,
            title: `🎯 ${todayGoal}`,
            description: `Meta do seu plano de desenvolvimento`,
            urgency: "MEDIUM",
            icon: "target",
            progress: activePlan.progress,
            actions: [
              { label: "Marcar como concluído", action: "complete", variant: "default" },
              { label: "Ver plano completo", action: "view-plan", variant: "outline" },
            ],
            metadata: { planId: activePlan.id },
          });
        }
      }
    }

    // Sort by priority (already sorted by insertion order due to priorityCounter)
    priorities.sort((a, b) => a.priority - b.priority);

    // Take top 5 priorities
    const topPriorities = priorities.slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        priorities: topPriorities,
        totalPriorities: priorities.length,
        breakdown: {
          medications: priorities.filter((p) => p.type === "medication").length,
          appointments: priorities.filter((p) => p.type === "appointment").length,
          exams: priorities.filter((p) => p.type === "exam").length,
          goals: priorities.filter((p) => p.type === "goal").length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching priorities:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
