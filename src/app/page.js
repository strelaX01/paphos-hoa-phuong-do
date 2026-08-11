import Header from '@/app/components/layout/Header'
import Footer from '@/app/components/layout/Footer'
import HeroSection from '@/app/components/home/HeroSection'
import AboutSection from '@/app/components/home/AboutSection'
import SignatureDishesSection from '@/app/components/home/SignatureDishesSection'
import VideoSpecialsSection from '@/app/components/home/VideoSpecialsSection'
import DiningPromiseSection from '@/app/components/home/DiningPromiseSection'
import GalleryPreview from '@/app/components/home/GalleryPreview'
import VisitUsSection from '@/app/components/home/VisitUsSection'
import BookingCTA from '@/app/components/home/BookingCTA'
import HomeMotionController from '@/app/components/home/HomeMotionController'
import RestaurantJsonLd from '@/app/components/shared/RestaurantJsonLd'
import { connection } from 'next/server'
import { getRestaurantProfileData, getTodayOpeningStatus } from '@/lib/restaurantProfileData'
import { getLatestPublishedVideos } from '@/lib/publicVideoData'
import { getHomepageContentData } from '@/lib/homepageData'
import { createPageMetadata, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  path: '/',
  absoluteTitle: true,
  keywords: ['Vietnamese restaurant Kissonerga', 'Vietnamese food Kissonerga', 'authentic pho Cyprus'],
})

export default async function Home() {
  await connection()
  const [restaurantData, videos, homepageContent] = await Promise.all([
    getRestaurantProfileData(),
    getLatestPublishedVideos(),
    getHomepageContentData(),
  ])
  const todayOpeningStatus = getTodayOpeningStatus(restaurantData.openingHours)

  return (
    <>
      <RestaurantJsonLd restaurantData={restaurantData} />
      <Header />
      <main>
        <HomeMotionController />
        <HeroSection
          openingStatus={todayOpeningStatus}
          restaurantProfile={restaurantData.profile}
          menuItemCount={homepageContent.menuItemCount}
        />
        <VideoSpecialsSection videos={videos} />
        <AboutSection />
        <SignatureDishesSection dishes={homepageContent.menuItems} openingStatus={todayOpeningStatus} />
        <DiningPromiseSection />
        <GalleryPreview images={homepageContent.galleryImages} />
        <VisitUsSection restaurantData={restaurantData} openingStatus={todayOpeningStatus} />
        <BookingCTA restaurantProfile={restaurantData.profile} openingStatus={todayOpeningStatus} />
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}
