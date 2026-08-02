import LegalPageShell, { LegalContact, LegalList } from '@/app/components/legal/LegalPageShell'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Cookie Policy',
  description: 'Learn about essential cookies, local storage, cart preferences, and optional third-party maps on the Hoa Phuong Do website.',
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
    content: () => <><p>Google Maps is not loaded automatically. It connects to Google only after you press “Load Google Map” or choose an external map link. Google may then process technical data or use its own cookies under its policies.</p><p>Public menu images and videos are delivered from our storage provider. We do not currently use advertising pixels or visitor analytics cookies.</p></>,
  },
  {
    id: 'choices',
    title: 'Your choices',
    content: () => <p>You can delete cookies and site storage through your browser settings. Blocking strictly necessary storage may prevent the cart or administrator login from working. Because optional analytics and advertising tools are not currently enabled and maps require a deliberate click, the website does not display a general cookie-consent banner.</p>,
  },
  {
    id: 'changes-contact',
    title: 'Changes and contact',
    content: (profile) => <><p>If we introduce analytics, advertising, or other optional technologies, we will update this policy and request consent before loading them where required.</p><LegalContact profile={profile} /></>,
  },
]

export default function CookiePolicyPage() {
  return <LegalPageShell eyebrow="Legal" title="Cookie Policy" introduction="A clear record of the essential browser storage used by the website and when third-party map content is loaded." sections={sections} />
}
