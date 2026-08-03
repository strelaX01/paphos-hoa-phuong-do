import { connection } from 'next/server'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import { getDeliveryAvailability } from '@/lib/deliveryConfig'
import { getRestaurantProfileData } from '@/lib/restaurantProfileData'
import CheckoutClient from './CheckoutClient'

export const metadata = {
  title: 'Checkout',
  description: 'Complete your Hoa Phuong Do delivery order with contact and address details.',
  robots: { index: false, follow: false },
}

export default async function CheckoutPage() {
  await connection()
  const restaurantData = await getRestaurantProfileData()
  const initialAvailability = getDeliveryAvailability(restaurantData.openingHours)

  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA] pt-28 pb-16 lg:pb-24">
        <div className="site-container">
          <CheckoutClient
            initialAvailability={initialAvailability}
            openingHours={restaurantData.openingHours}
          />
        </div>
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}
