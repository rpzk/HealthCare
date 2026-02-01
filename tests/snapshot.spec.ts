import { test } from '@playwright/test';
import { getSessionCookie } from './session-helper';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3000';

const roles = {
  admin: { email: 'admin@healthcare.com', password: 'admin123' },
  doctor: { email: 'doctor@healthcare.com', password: 'doctor123' },
  patient: { email: 'patient@healthcare.com', password: 'patient123' },
};

async function setupSession(context: any, role: keyof typeof roles) {
  const cookieHeader = await getSessionCookie(roles[role].email, roles[role].password);
  if (cookieHeader) {
    const cookiesArray = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const cookieList = cookiesArray.map((cookie) => {
      const pair = cookie.split(';')[0];
      const [name, ...rest] = pair.trim().split('=');
      const value = rest.join('=');
      const c = {
        name: name.trim(),
        value: value.trim(),
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: true,
      };
      if (name.startsWith('__Host-')) delete (c as any).domain;
      return c;
    }).filter(c => c.name && c.value);
    await context.addCookies(cookieList as any);
  }
}

test('Capture Snapshots', async ({ page, context }) => {
  await setupSession(context, 'doctor');
  
  const pages = ['/prescriptions', '/consultations', '/medical-records'];
  for (const p of pages) {
    await page.goto(`${BASE_URL}${p}`);
    await page.waitForLoadState('networkidle');
    const content = await page.content();
    fs.writeFileSync(`snapshot-${p.replace(/\//g, '-')}.html`, content);
    console.log(`Saved snapshot for ${p}`);
  }
});
