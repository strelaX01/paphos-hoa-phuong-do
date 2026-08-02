import LegalPageShell, { LegalContact, LegalList } from '@/app/components/legal/LegalPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Terms and Conditions',
  description: 'Terms for Hoa Phuong Do table reservations, delivery orders, prices, payment, cancellations, and website use.',
  path: '/terms-and-conditions',
})

const sections = [
  {
    id: 'scope',
    title: 'About these terms',
    content: (profile) => <><p>These terms apply when you use the {profile.name} website, request a table reservation, or place a delivery order. By submitting a request, you confirm that the details you provide are accurate and that you are able to enter into the transaction.</p><LegalContact profile={profile} /></>,
  },
  {
    id: 'menu-availability',
    title: 'Menu and availability',
    content: () => <><p>Menu descriptions and images are provided to help you choose. Presentation, ingredients, portion appearance, and availability may vary. An order or reservation request is not accepted until the restaurant confirms it.</p><p>We may decline or contact you to amend a request if an item is unavailable, the restaurant is closed, delivery is not possible, or information is incomplete.</p></>,
  },
  {
    id: 'prices-payment',
    title: 'Prices and payment',
    content: () => <><p>Prices are shown in euros and the current payment method for website delivery orders is cash on delivery. The restaurant verifies item prices and availability when processing the order.</p><p>The checkout displays the current nearby and farther-area delivery fees. The applicable fee depends on the delivery address and will be confirmed by the restaurant before fulfilment. You must accept the displayed delivery-fee policy before placing an order.</p></>,
  },
  {
    id: 'delivery',
    title: 'Delivery orders',
    content: () => <LegalList><li>Provide a reachable phone number and complete delivery address.</li><li>Estimated preparation or delivery times are not guarantees and may change with traffic, weather, demand, or kitchen conditions.</li><li>Inspect the order promptly and contact us as soon as possible if an item is missing, incorrect, or materially damaged.</li><li>You are responsible for ensuring someone can receive and pay for the order at the confirmed address.</li></LegalList>,
  },
  {
    id: 'reservations',
    title: 'Table reservations',
    content: () => <><p>A website submission is a reservation request. Your table is confirmed only after the restaurant accepts the request. Please arrive on time and contact us if your party size or arrival time changes.</p><p>We may release a table after a reasonable delay if we cannot contact you. Special seating, accessibility, allergy, and celebration requests are considered but cannot always be guaranteed.</p></>,
  },
  {
    id: 'changes-cancellations',
    title: 'Changes and cancellations',
    content: (profile) => <><p>Contact the restaurant as soon as possible to change or cancel an order or reservation. An order may no longer be cancellable after preparation or delivery has started. Any refund or replacement will be assessed according to the circumstances and applicable consumer law.</p><LegalContact profile={profile} /></>,
  },
  {
    id: 'allergens',
    title: 'Allergens and dietary needs',
    content: (profile) => <><p>Tell us about allergies before ordering. Menu descriptions cannot list every ingredient, and food is prepared in an environment where allergens may be present. Do not rely only on website labels for a serious allergy.</p><LegalContact profile={profile} /></>,
  },
  {
    id: 'website-liability',
    title: 'Website use and liability',
    content: () => <p>We work to keep information accurate and the website available, but temporary interruptions or errors may occur. Nothing in these terms excludes rights or liability that cannot legally be excluded under Cyprus or European Union law.</p>,
  },
  {
    id: 'law-updates',
    title: 'Law and updates',
    content: () => <p>These terms are governed by the laws of the Republic of Cyprus, without limiting mandatory consumer protections. We may update the terms when the service or legal requirements change; the latest version applies to new requests.</p>,
  },
]

export default function TermsPage() {
  return <LegalPageShell eyebrow="Legal" title="Terms and Conditions" introduction="The practical terms for using our website, requesting a table, and ordering food for delivery." sections={sections} />
}
