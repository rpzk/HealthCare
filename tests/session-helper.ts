import { request } from '@playwright/test';

export async function getSessionCookie(email: string, password: string) {
  // Faz login via API NextAuth e retorna o cookie de sessão
  const context = await request.newContext();
  const res = await context.post('http://localhost:3000/api/auth/callback/credentials', {
    form: {
      email,
      password,
      csrfToken: 'test', // NextAuth ignora CSRF em dev/test
    },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const cookies = res.headers()['set-cookie'];
  await context.dispose();
  return cookies;
}
