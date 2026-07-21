import { Cormorant_Garamond, Inter } from 'next/font/google'
import { connection } from 'next/server'

import PhoneCallPopup from './components/shared/PhoneCallPopup'
import FestivalEffect from './components/shared/FestivalEffect'
import StorefrontNoticePopup from './components/shared/StorefrontNoticePopup'
import { getRestaurantProfileData, splitPhoneNumbers } from '@/lib/restaurantProfileData'
import { getActiveStorefrontEffect } from '@/lib/storefrontEffectData'
import { getActiveStorefrontNotice } from '@/lib/storefrontNoticeData'
import './globals.css'

const cormorant = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'Hoa Phuong Do | Authentic Vietnamese Restaurant in Paphos',
  description: 'Experience authentic Vietnamese cuisine, fresh ingredients, and warm hospitality in Paphos, Cyprus.',
  keywords: ['Vietnamese restaurant', 'Cyprus', 'Paphos', 'Kissonerga', 'Hoa Phuong Do', 'pho', 'Vietnamese food'],
  openGraph: {
    title: 'Hoa Phuong Do | Vietnamese Restaurant in Paphos',
    description: 'Authentic Vietnamese cuisine in Paphos, Cyprus. Book a table or order delivery.',
    locale: 'en_CY',
    type: 'website',
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
    <html lang="en" className={`${cormorant.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <FestivalEffect config={storefrontEffect} />
        <StorefrontNoticePopup notice={storefrontNotice} />
        <PhoneCallPopup phoneNumbers={phoneNumbers} restaurantName={restaurantData.profile.name} />
      </body>
    </html>
  )
}
