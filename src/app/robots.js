import { absoluteUrl, getSiteUrl } from '@/lib/seo'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/driver/', '/api/', '/checkout'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: getSiteUrl(),
  }
}
