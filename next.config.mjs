/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable proper TypeScript and ESLint checking during builds
  eslint: {
    // Only ignore ESLint during builds in development, not production
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  typescript: {
    // Only ignore TypeScript errors during builds in development, not production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  images: {
    // Keep unoptimized for now, but consider enabling optimization in production
    unoptimized: true,
    // Add security headers for images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  devIndicators: {
    buildActivity: false,
  },
  // Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
}

export default nextConfig
