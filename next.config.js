/** @type {import('next').NextConfig} */
const isCI = process.env.CI === 'true' || process.env.CI === '1'
const nextConfig = {
  eslint: {
    // Em CI, não ignore; local/dev pode ignorar para velocidade
    ignoreDuringBuilds: !isCI,
  },
  typescript: {
    // Em CI, falhar em erros de tipos; local/dev pode ignorar temporariamente
    ignoreBuildErrors: !isCI,
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
