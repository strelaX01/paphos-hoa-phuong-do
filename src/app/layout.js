import { connection } from 'next/server'

import PhoneCallPopup from './components/shared/PhoneCallPopup'
import FestivalEffect from './components/shared/FestivalEffect'
import StorefrontNoticePopup from './components/shared/StorefrontNoticePopup'
import { getRestaurantProfileData, splitPhoneNumbers } from '@/lib/restaurantProfileData'
import { getActiveStorefrontEffect } from '@/lib/storefrontEffectData'
import { getActiveStorefrontNotice } from '@/lib/storefrontNoticeData'
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, getSiteUrl, SITE_NAME, SOCIAL_IMAGE } from '@/lib/seo'
import './globals.css'

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'food and drink',
  keywords: ['Vietnamese restaurant Paphos', 'Vietnamese food Cyprus', 'Kissonerga restaurant', 'pho Paphos', 'Hoa Phuong Do'],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: '/',
    siteName: SITE_NAME,
    locale: 'en_CY',
    type: 'website',
    images: [{ url: SOCIAL_IMAGE, width: 1672, height: 941, alt: 'Vietnamese food at Hoa Phuong Do in Paphos' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export default async function RootLayout({ children }) {
  await connection()
  const [restaurantData, storefrontEffect, storefrontNotice] = await Promise.all([
    getRestaurantProfileData(),
    getActiveStorefrontEffect(),
    getActiveStorefrontNotice(),
  ])
  const phoneNumbers = splitPhoneNumbers(restaurantData.profile.phone)

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <FestivalEffect config={storefrontEffect} />
        <StorefrontNoticePopup notice={storefrontNotice} />
        <PhoneCallPopup phoneNumbers={phoneNumbers} restaurantName={restaurantData.profile.name} />
      </body>
    </html>
  )
}
