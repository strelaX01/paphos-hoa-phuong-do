import LegalPageShell, { LegalContact, LegalList } from '@/app/components/legal/LegalPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description: 'Read how Hoa Phuong Do collects, uses, stores, and protects information submitted through reservations and delivery orders.',
  path: '/privacy-policy',
})

const sections = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    content: (profile) => <><p>{profile.name} operates this website and is responsible for the personal information described in this policy.</p><LegalContact profile={profile} /></>,
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    content: () => <><p>We collect information you choose to provide when making a reservation, placing a delivery order, or contacting the restaurant.</p><LegalList><li>Name, phone number, and optional email address.</li><li>Reservation date, time, guest count, and special requests.</li><li>Delivery address, map pin coordinates, calculated route distance and time, order contents, dish notes, and delivery instructions.</li><li>Order, reservation, payment, and fulfilment status. We do not collect card details because online orders are currently paid in cash.</li><li>Limited technical and security information, such as IP-derived rate-limit records and authentication activity.</li></LegalList></>,
  },
  {
    id: 'how-we-use-data',
    title: 'How we use information',
    content: () => <LegalList><li>To receive, confirm, prepare, deliver, and support orders.</li><li>To process and manage table reservation requests.</li><li>To contact you about availability, delivery fees, changes, or problems with your request.</li><li>To protect the website, prevent abuse, and maintain reliable records.</li><li>To meet accounting, tax, legal, and regulatory obligations.</li></LegalList>,
  },
  {
    id: 'legal-bases',
    title: 'Legal bases',
    content: () => <p>We process information where it is necessary to take steps at your request or provide restaurant services, to comply with legal obligations, and for legitimate interests such as service administration, fraud prevention, and website security. Where consent is legally required, you may withdraw it at any time.</p>,
  },
  {
    id: 'sharing',
    title: 'Who receives information',
    content: () => <><p>Information is available only to people and service providers who need it to operate the restaurant and website.</p><LegalList><li>Hosting, database, file-storage, and email-delivery providers acting on our instructions.</li><li>Restaurant staff responsible for reservations, kitchen operations, delivery, and customer support.</li><li>OpenFreeMap supplies checkout map tiles, and openrouteservice processes delivery coordinates to search addresses and calculate driving routes.</li><li>Google Maps only when you choose to load or open a Google map or delivery-pin link.</li><li>Professional advisers, payment or accounting services, and public authorities where legally required.</li></LegalList><p>Some providers may process information outside Cyprus or the European Economic Area. Where required, we rely on recognised safeguards for those transfers. We do not sell personal information.</p></>,
  },
  {
    id: 'retention-security',
    title: 'Retention and security',
    content: () => <><p>We keep information only for as long as reasonably needed to provide the service, resolve disputes, maintain business records, and satisfy legal obligations. Retention periods can differ by record type.</p><p>We use access controls, protected administrator sessions, rate limiting, and restricted service credentials. No internet service can guarantee absolute security.</p></>,
  },
  {
    id: 'rights',
    title: 'Your rights',
    content: (profile) => <><p>Subject to applicable law, you may ask to access, correct, erase, restrict, or receive a copy of your personal information, or object to certain processing. You may also complain to the Office of the Commissioner for Personal Data Protection in Cyprus.</p><LegalContact profile={profile} /></>,
  },
  {
    id: 'updates',
    title: 'Policy updates',
    content: () => <p>We may update this policy when our services, providers, or legal obligations change. The latest version and update date will always appear on this page.</p>,
  },
]

export default function PrivacyPolicyPage() {
  return <LegalPageShell eyebrow="Legal" title="Privacy Policy" introduction="How we handle the information you share when booking a table, ordering delivery, or contacting Hoa Phuong Do." sections={sections} />
}
