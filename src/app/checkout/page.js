import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import CheckoutClient from './CheckoutClient'

export const metadata = {
  title: 'Checkout',
  description: 'Complete your Hoa Phuong Do delivery order with contact and address details.',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA] pt-28 pb-16 lg:pb-24">
        <div className="site-container">
          <CheckoutClient />
        </div>
      </main>
      <Footer />
    </>
  )
}
