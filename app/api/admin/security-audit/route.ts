/**
 * Security Audit API
 * 
 * Endpoints para auditoria de segurança
 * Acesso restrito a ADMIN
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { securityAuditService } from '@/lib/security-audit-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Apenas ADMIN pode acessar relatórios de segurança
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar relatórios de segurança.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'full'

    switch (action) {
      case 'full': {
        const report = await securityAuditService.runFullAudit()
        
        // Map checks to severity levels
        const criticalChecks = report.checks.filter(c => c.severity === 'critical' && c.status === 'fail')
        const highChecks = report.checks.filter(c => c.severity === 'high' && c.status === 'fail')
        
        // Determine risk level based on score
        let riskLevel = 'LOW'
        if (report.overallScore < 50) riskLevel = 'CRITICAL'
        else if (report.overallScore < 70) riskLevel = 'HIGH'
        else if (report.overallScore < 85) riskLevel = 'MEDIUM'
        
        return NextResponse.json({
          success: true,
          report,
          summary: {
            overallScore: report.overallScore,
            riskLevel,
            totalChecks: report.totalChecks,
            passed: report.passed,
            warnings: report.warnings,
            failed: report.failed,
            criticalIssues: criticalChecks.length,
            highIssues: highChecks.length
          }
        })
      }

      case 'compliance': {
        const report = await securityAuditService.runFullAudit()
        
        // Extract LGPD checks
        const lgpdChecks = report.checks.filter(c => c.category === 'lgpd')
        const lgpdPassed = lgpdChecks.filter(c => c.status === 'pass').length
        const lgpdTotal = lgpdChecks.length
        
        return NextResponse.json({
          success: true,
          compliance: {
            lgpd: {
              score: lgpdTotal > 0 ? Math.round((lgpdPassed / lgpdTotal) * 100) : 0,
              checks: lgpdChecks,
              compliant: lgpdPassed === lgpdTotal
            }
          }
        })
      }

      case 'access': {
        const report = await securityAuditService.runFullAudit()
        const accessChecks = report.checks.filter(c => c.category === 'auth' || c.category === 'access')
        
        return NextResponse.json({
          success: true,
          accessAnalysis: {
            checks: accessChecks,
            summary: {
              passed: accessChecks.filter(c => c.status === 'pass').length,
              failed: accessChecks.filter(c => c.status === 'fail').length,
              warnings: accessChecks.filter(c => c.status === 'warning').length
            }
          }
        })
      }

      case 'findings': {
        const report = await securityAuditService.runFullAudit()
        const severity = searchParams.get('severity')
        
        // Filter checks that are not passing (findings)
        let findings = report.checks.filter(c => c.status === 'fail' || c.status === 'warning')
        
        if (severity) {
          findings = findings.filter(c => c.severity === severity.toLowerCase())
        }
        
        return NextResponse.json({
          success: true,
          findings,
          total: findings.length
        })
      }

      case 'metrics': {
        const metrics = await securityAuditService.getSecurityMetrics()
        
        return NextResponse.json({
          success: true,
          metrics
        })
      }

      case 'recommendations': {
        const report = await securityAuditService.runFullAudit()
        
        return NextResponse.json({
          success: true,
          recommendations: report.recommendations,
          topPriority: report.recommendations.slice(0, 5)
        })
      }

      case 'logs': {
        const logs = await securityAuditService.getRecentAuditLogs(50)
        
        return NextResponse.json({
          success: true,
          logs,
          total: logs.length
        })
      }

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[SecurityAudit] Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Marcar finding como resolvido ou aceitar risco
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, findingId, notes } = body

    switch (action) {
      case 'resolve':
        return NextResponse.json({
          success: true,
          message: `Finding ${findingId} marcado como resolvido`,
          resolvedBy: session.user.name,
          resolvedAt: new Date().toISOString()
        })

      case 'accept_risk':
        return NextResponse.json({
          success: true,
          message: `Risco aceito para finding ${findingId}`,
          acceptedBy: session.user.name,
          acceptedAt: new Date().toISOString(),
          notes
        })

      case 'export': {
        const report = await securityAuditService.runFullAudit()
        
        // Gerar relatório em formato estruturado
        const exportData = {
          reportType: 'Security Audit Report',
          generatedBy: session.user.name,
          exportedAt: new Date().toISOString(),
          ...report
        }

        return NextResponse.json({
          success: true,
          exportData,
          format: 'json'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[SecurityAudit] POST Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
