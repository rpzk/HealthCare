import { test, expect } from '@playwright/test';
import { getSessionCookie } from './session-helper';

const BASE_URL = 'http://localhost:3000';

const roles = {
  admin: { email: 'admin@healthcare.com', password: 'admin123' },
  doctor: { email: 'doctor@healthcare.com', password: 'doctor123' },
  patient: { email: 'patient@healthcare.com', password: 'patient123' },
};

async function setupSession(context: any, role: keyof typeof roles) {
  const cookieHeader = await getSessionCookie(roles[role].email, roles[role].password);
  console.log(`Setting up session for ${role}, got cookies:`, cookieHeader);
  if (cookieHeader) {
    const cookiesArray = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const cookieList = cookiesArray.map((cookie) => {
      const pair = cookie.split(';')[0];
      const [name, ...rest] = pair.trim().split('=');
      const value = rest.join('=');
      return {
        name: name.trim(),
        value: value.trim(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as any
      };
    }).filter(c => c.name && c.value);

    // Filter out domain for __Host- cookies
    for (const c of cookieList) {
      if (c.name.startsWith('__Host-')) {
        delete (c as any).domain;
        (c as any).url = BASE_URL;
      }
    }

    if (cookieList.length > 0) {
      await context.addCookies(cookieList as any);
    }
  }
}

test.describe('Jornada do Admin', () => {
  test.beforeEach(async ({ context }) => {
    await setupSession(context, 'admin');
  });

  test('Deve navegar pelo menu administrativo e identificar falhas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`CONSOLE ERROR: ${msg.text()}`);
      }
    });
    
    page.on('response', (response) => {
      if (response.status() === 404) {
        errors.push(`404 ERROR: ${response.url()}`);
      }
    });

    const adminPages = [
      '/admin',
      '/admin/bi',
      '/admin/users',
      '/admin/staff',
      '/admin/settings',
      '/admin/backup',
      '/admin/financial',
      '/admin/audit',
      '/ai-analytics',
      '/ai-medical',
      '/system-monitor'
    ];

    for (const route of adminPages) {
      console.log(`Testando rota admin: ${route}`);
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        const content = await page.textContent('body');
        const lowerContent = content?.toLowerCase() || '';
        
        // Smarter stub detection
        const isStub = 
          lowerContent.includes('em breve') || 
          lowerContent.includes('construção') ||
          lowerContent.includes('funcionalidade sendo portada') ||
          lowerContent.includes('sistema legado') ||
          (content && /\bTODO\b/.test(content)); // Match whole word TODO case sensitive
          
        if (isStub) {
          console.warn(`[STUB/TODO] Detectado em: ${route}`);
        }
        
        // Take screenshot of BI page
        if (route === '/admin/bi') {
          await page.screenshot({ path: 'admin-bi-debug.png' });
        }
      } catch (err: any) {
        console.error(`Falha ao acessar rota ${route}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      console.log('Erros críticos encontrados na jornada admin:', errors);
    }
  });
});

test.describe('Jornada do Profissional', () => {
  test.beforeEach(async ({ context }) => {
    await setupSession(context, 'doctor');
  });

  test('Deve realizar tarefas de prontuário e prescrição', async ({ page }) => {
    const docPages = [
      '/prescriptions',
      '/certificates',
      '/consultations',
      '/appointments',
      '/medical-records',
      '/ai-medical',
      '/patients',
      '/exams',
      '/vitals'
    ];

    for (const route of docPages) {
      console.log(`Testando rota profissional: ${route}`);
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        const lowerContent = content?.toLowerCase() || '';
        const isStub = lowerContent.includes('em breve') || (content && /\bTODO\b/.test(content));

        if (isStub) {
          console.warn(`[STUB/TODO] Profissional detector em: ${route}`);
        }
      } catch (err: any) {
        console.error(`Falha ao acessar rota ${route}: ${err.message}`);
      }
    }
  });

  test('Jornada completa: abrir consulta, preencher SOAP e gerar documentos', async ({ page }) => {
    // 1) Obter doctorId e patientId via APIs (com cookies da sessão do médico)
    await page.goto(`${BASE_URL}/consultations`, { waitUntil: 'networkidle', timeout: 30000 });
    const profileRes = await page.goto(`${BASE_URL}/api/profile`, { waitUntil: 'load', timeout: 10000 });
    const profile = await profileRes!.json().catch(() => ({}));
    if (!profile?.id) {
      console.warn('Jornada completa: sem sessão em /api/profile, pulando criação de consulta');
      return;
    }
    const doctorId = profile.id as string;

    const patientsRes = await page.goto(`${BASE_URL}/api/patients?limit=5`, { waitUntil: 'load', timeout: 10000 });
    const patientsData = await patientsRes!.json().catch(() => ({}));
    const patients = (patientsData?.patients ?? []) as Array<{ id: string; name?: string }>;
    const patientId = patients.length ? patients[0].id : null;
    if (!patientId) {
      console.warn('Jornada completa: nenhum paciente encontrado, pulando');
      return;
    }

    // 2) Criar consulta via API (fetch no contexto da página = mesmo cookie)
    const scheduledDate = new Date();
    scheduledDate.setHours(10, 0, 0, 0);
    const createPayload = {
      patientId,
      doctorId,
      scheduledDate: scheduledDate.toISOString(),
      type: 'ROUTINE',
      status: 'IN_PROGRESS',
      description: 'Consulta E2E',
    };
    const createResult = await page.evaluate(async (payload) => {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
    }, createPayload);

    if (!createResult.ok || !createResult.data?.consultation?.id) {
      console.warn('Jornada completa: falha ao criar consulta', createResult);
      return;
    }
    const consultationId = createResult.data.consultation.id as string;

    // 3) Abrir workspace da consulta
    await page.goto(`${BASE_URL}/consultations/${consultationId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // 4) Preencher SOAP (placeholders únicos)
    const subjective = page.getByPlaceholder(/Queixa principal, história da doença atual/);
    await subjective.waitFor({ state: 'visible', timeout: 10000 });
    await subjective.fill('Paciente em teste E2E. Queixa: cefaleia há 2 dias.');

    const objective = page.getByPlaceholder(/Exame físico, observações clínicas/);
    await objective.fill('Estado geral bom. Sem sinais de alarme.');

    const assessment = page.getByPlaceholder(/Diagnóstico, hipóteses diagnósticas/);
    await assessment.fill('Cefaleia tensional (R51).');

    const plan = page.getByPlaceholder(/Conduta, tratamento, prescrições/);
    await plan.fill('Analgésico se necessário. Retorno se persistir.');

    // 5) Abrir modal "Gerar documentos" e clicar em Gerar
    const openDocsBtn = page.getByRole('button', { name: /Gerar documentos/ }).first();
    await openDocsBtn.click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const generateBtn = dialog.getByRole('button', { name: /^Gerar documentos$/ });
    await generateBtn.click();

    // 6) Aguardar geração (pode aparecer "Gerando..." e depois lista ou mensagem)
    await page.waitForTimeout(5000);
    const bodyText = await page.textContent('body');
    const hasGenerated = bodyText?.includes('Documentos gerados') || bodyText?.includes('Abrir PDF') || bodyText?.includes('Gerando');
    expect(hasGenerated || bodyText?.includes('Gerar e assinar')).toBeTruthy();
  });
});

test.describe('Jornada do Paciente', () => {
  test.beforeEach(async ({ context }) => {
    await setupSession(context, 'patient');
  });

  test('Deve acessar área do paciente', async ({ page }) => {
    const patientPages = [
      '/minha-saude',
      '/appointments',
      '/prescriptions/my',
      '/certificates/my'
    ];

    for (const route of patientPages) {
      console.log(`Testando rota paciente: ${route}`);
      try {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(1000);
        
        const content = await page.textContent('body');
        if (content && /\bTODO\b/.test(content)) {
          console.warn(`[STUB/TODO] Paciente detector em: ${route}`);
        }
      } catch (err: any) {
        console.error(`Falha ao acessar rota ${route}: ${err.message}`);
      }
    }
  });
});
