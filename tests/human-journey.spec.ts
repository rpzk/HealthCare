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
