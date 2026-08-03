export const SITE_NAME = 'Hoa Phuong Do'
export const DEFAULT_TITLE = 'Hoa Phuong Do | Vietnamese Restaurant in Paphos'
export const DEFAULT_DESCRIPTION = 'Authentic Vietnamese food in Kissonerga, Paphos. Explore the menu, order delivery, or reserve a table at Hoa Phuong Do.'
export const SOCIAL_IMAGE = '/images/hoa-phuong-do-social.jpg'
export const SOCIAL_IMAGE_WIDTH = 1200
export const SOCIAL_IMAGE_HEIGHT = 630

export function getSiteUrl() {
  const configuredUrl = process.env.APP_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || 'http://localhost:3000'

  try {
    const url = new URL(configuredUrl)
    if (process.env.NODE_ENV === 'production' && url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      url.protocol = 'https:'
    }
    url.pathname = '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return 'http://localhost:3000'
  }
}

export function absoluteUrl(path = '/') {
  return new URL(path, `${getSiteUrl()}/`).toString()
}

export function createPageMetadata({ title, description, path, keywords = [], absoluteTitle = false }) {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'en_CY',
      type: 'website',
      images: [
        {
          url: SOCIAL_IMAGE,
          width: SOCIAL_IMAGE_WIDTH,
          height: SOCIAL_IMAGE_HEIGHT,
          alt: 'Vietnamese food at Hoa Phuong Do in Paphos',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SOCIAL_IMAGE],
    },
  }
}

const schemaDays = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

function openingHoursSpecification(openingHours = []) {
  return openingHours.flatMap((entry) => {
    if (entry.isClosed) return []

    const day = schemaDays[String(entry.day || '').trim().toLowerCase()]
    const timeRange = String(entry.hours || '').match(/(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/)
    if (!day || !timeRange) return []

    return [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${day}`,
      opens: timeRange[1],
      closes: timeRange[2],
    }]
  })
}

export function createRestaurantJsonLd({ profile, openingHours }) {
  const phoneNumbers = String(profile?.phone || '')
    .split('/')
    .map((phone) => phone.trim())
    .filter(Boolean)

  const restaurant = {
    '@type': 'Restaurant',
    '@id': absoluteUrl('/#restaurant'),
    name: profile?.name || SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl('/'),
    image: absoluteUrl(SOCIAL_IMAGE),
    logo: absoluteUrl('/images/hoa-phuong-do-logo.png'),
    servesCuisine: ['Vietnamese', 'Asian'],
    priceRange: '€€',
    hasMenu: absoluteUrl('/menu'),
    acceptsReservations: true,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile?.address || 'Leoforos Chrysoneras, 79 Efstathios Plaza',
      addressLocality: 'Kissonerga',
      addressRegion: 'Paphos',
      postalCode: '8574',
      addressCountry: 'CY',
    },
    openingHoursSpecification: openingHoursSpecification(openingHours),
  }

  if (phoneNumbers[0]) restaurant.telephone = phoneNumbers[0]
  if (profile?.email) restaurant.email = profile.email
  if (/^https?:\/\//i.test(profile?.mapUrl || '')) restaurant.hasMap = profile.mapUrl

  return {
    '@context': 'https://schema.org',
    '@graph': [
      restaurant,
      {
        '@type': 'WebSite',
        '@id': absoluteUrl('/#website'),
        name: SITE_NAME,
        url: absoluteUrl('/'),
        inLanguage: 'en',
        publisher: { '@id': absoluteUrl('/#restaurant') },
      },
    ],
  }
}
