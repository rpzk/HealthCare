import { test, expect, request } from '@playwright/test';
import { getSessionCookie } from './session-helper';

test('Auditoria de erros na página de prescrições', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push('PAGE ERROR: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  // Autenticação programática: obter cookie de sessão NextAuth
  const cookies = await getSessionCookie('test@local.dev', '123456');
  if (cookies) {
    // Extrai cookies válidos do header set-cookie
    const cookieList = cookies
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((cookie) => {
        // Só pega o par nome=valor antes do primeiro ponto e vírgula
        const pair = cookie.split(';')[0];
        const [name, ...rest] = pair.trim().split('=');
        const value = rest.join('=');
        if (!name || typeof value === 'undefined' || value === '') return null;
        // Playwright exige que o valor seja string
        return {
          name: name.trim(),
          value: value.trim(),
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
        };
      })
      .filter((c) => c && typeof c.name === 'string' && typeof c.value === 'string');
    if (cookieList.length > 0) {
      await context.addCookies(cookieList);
    }
  }

  await page.goto('http://localhost:3000/prescriptions');
  await page.waitForSelector('text=Prescrições Médicas', { timeout: 10000 });
  await page.waitForTimeout(2000);

  if (errors.length > 0) {
    console.log('Erros encontrados no console:', errors);
  }
  expect(errors.length, 'Nenhum erro crítico no console').toBe(0);
});
