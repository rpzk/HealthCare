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
    serverComponentsExternalPackages: ['@prisma/client', '@prisma/engines'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const prismaPackages = ['@prisma/client', '@prisma/engines']
      if (typeof config.externals === 'undefined') {
        config.externals = [...prismaPackages]
      } else if (Array.isArray(config.externals)) {
        config.externals.push(...prismaPackages)
      } else if (typeof config.externals === 'function') {
        const original = config.externals
        config.externals = (context, request, callback) => {
          if (prismaPackages.includes(request)) {
            return callback(null, 'commonjs ' + request)
          }
          return original(context, request, callback)
        }
      }
    }
    return config
  },
}

module.exports = nextConfig
