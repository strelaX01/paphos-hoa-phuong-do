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
import { connection } from 'next/server'
import { getRestaurantProfileData, getTodayOpeningStatus } from '@/lib/restaurantProfileData'
import { getLatestPublishedVideos } from '@/lib/publicVideoData'
import { getHomepageContentData } from '@/lib/homepageData'

export const metadata = {
  title: 'Hoa Phuong Do | Authentic Vietnamese Restaurant in Paphos',
  description:
    'Experience authentic Vietnamese cuisine crafted with passion. Traditional recipes, fresh ingredients, and warm hospitality in Kissonerga, Paphos.',
}

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
      <Header />
      <main>
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
