import LegalPageShell, { LegalContact, LegalList } from '@/app/components/legal/LegalPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Cookie Policy',
  description: 'Learn about essential cookies, local storage, cart preferences, and third-party maps on the Hoa Phuong Do website.',
  path: '/cookie-policy',
})

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content: () => <p>This policy explains how this website uses cookies and similar browser storage. Cookies are small files stored by a website; local and session storage are browser features used for similar functional purposes.</p>,
  },
  {
    id: 'necessary',
    title: 'Strictly necessary storage',
    content: () => <><p>We use storage that is necessary to provide features you request:</p><LegalList><li>An administrator authentication cookie keeps authorised staff signed in securely. It is HTTP-only, restricted to the site, and expires after a limited period.</li><li>Local browser storage keeps delivery-cart items, quantities, and dish notes while you move between pages.</li><li>Security and rate-limit records help prevent repeated login, order, reservation, and password-reset abuse.</li></LegalList><p>These functions are not used for advertising or cross-site tracking.</p></>,
  },
  {
    id: 'preferences',
    title: 'Preference storage',
    content: () => <p>The website may remember that you dismissed a storefront notice and whether a seasonal visual effect has already played. This avoids repeatedly interrupting your visit. You can clear these preferences using your browser&apos;s site-data controls.</p>,
  },
  {
    id: 'third-parties',
    title: 'Third-party content',
    content: () => <><p>The delivery checkout loads map tiles from OpenFreeMap. Address searches and route calculations are sent from our server to openrouteservice. These services receive technical request data needed to return the map or route, but we do not use them for advertising or cross-site tracking.</p><p>Google Maps connects only after you choose a Google map or delivery-pin link and may then use its own cookies under its policies. Public menu images and videos are delivered from our storage provider. We do not currently use advertising pixels or visitor analytics cookies.</p></>,
  },
  {
    id: 'choices',
    title: 'Your choices',
    content: () => <p>You can delete cookies and site storage through your browser settings. Blocking strictly necessary storage may prevent the cart or administrator login from working. Because optional analytics and advertising tools are not currently enabled, the website does not display a general cookie-consent banner.</p>,
  },
  {
    id: 'changes-contact',
    title: 'Changes and contact',
    content: (profile) => <><p>If we introduce analytics, advertising, or other optional technologies, we will update this policy and request consent before loading them where required.</p><LegalContact profile={profile} /></>,
  },
]

export default function CookiePolicyPage() {
  return <LegalPageShell eyebrow="Legal" title="Cookie Policy" introduction="A clear record of the essential browser storage and third-party map services used by the website." sections={sections} />
}
