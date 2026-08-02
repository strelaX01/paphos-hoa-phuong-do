import { absoluteUrl, SOCIAL_IMAGE } from '@/lib/seo'

const publicRoutes = [
  { path: '/', changeFrequency: 'weekly', priority: 1, images: [SOCIAL_IMAGE] },
  { path: '/menu', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/delivery', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/book-table', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/gallery', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms-and-conditions', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookie-policy', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap() {
  return publicRoutes.map(({ path, images, ...route }) => ({
    url: absoluteUrl(path),
    ...route,
    ...(images ? { images: images.map((image) => absoluteUrl(image)) } : {}),
  }))
}
