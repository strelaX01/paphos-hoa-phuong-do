function getSupabaseImagePattern() {
  const value = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) return null

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) return null

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'menu-images'
    if (!/^[a-zA-Z0-9_-]+$/.test(bucket)) return null

    return {
      protocol: 'https',
      hostname: url.hostname,
      port: '',
      pathname: `/storage/v1/object/public/${bucket}/**`,
      search: '',
    }
  } catch {
    return null
  }
}

const supabaseImagePattern = getSupabaseImagePattern()

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    maximumDiskCacheSize: 64_000_000,
    minimumCacheTTL: 86_400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ]

    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ]
  },
};

export default nextConfig;
