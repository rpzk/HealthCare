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
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
  // Skip collecting static props during build in Docker
  staticPageGenerationTimeout: 0,
}

module.exports = nextConfig
