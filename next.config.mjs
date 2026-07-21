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
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  images: {
    maximumDiskCacheSize: 0,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
};

export default nextConfig;
