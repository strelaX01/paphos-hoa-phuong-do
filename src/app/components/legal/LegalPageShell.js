import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { connection } from 'next/server'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import { getRestaurantProfileData } from '@/lib/restaurantProfileData'

export default async function LegalPageShell({ eyebrow, title, introduction, sections }) {
  await connection()
  const restaurantData = await getRestaurantProfileData()
  const { profile } = restaurantData

  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA] text-[#2B2B2B]">
        <section className="border-b border-[#E4DAC9] bg-[#1E1A18] pt-24 text-white">
          <div className="site-container py-14 sm:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60 sm:text-base">{introduction}</p>
            <p className="mt-6 text-xs text-white/35">Last updated: 2 August 2026</p>
          </div>
        </section>

        <section className="site-container py-12 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center lg:gap-16">
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9B2727]">On this page</p>
              <nav aria-label={`${title} sections`} className="mt-4 flex flex-wrap gap-x-5 gap-y-3 lg:flex-col lg:items-start">
                {sections.map((section, index) => (
                  <a key={section.id} href={`#${section.id}`} className="text-sm text-[#6B6560] transition-colors hover:text-[#8B1E1E]">
                    {String(index + 1).padStart(2, '0')}. {section.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="min-w-0 divide-y divide-[#E4DAC9] border-y border-[#E4DAC9]">
              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="scroll-mt-28 py-8 sm:py-10">
                  <div className="flex items-baseline gap-4">
                    <span className="text-xs font-semibold text-[#B28A17]">{String(index + 1).padStart(2, '0')}</span>
                    <h2 className="font-display text-3xl font-bold sm:text-4xl">{section.title}</h2>
                  </div>
                  <div className="mt-5 space-y-4 text-[15px] leading-7 text-[#625C55]">{section.content(profile)}</div>
                </section>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-[996px] border-t border-[#E4DAC9] pt-7">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B1E1E]">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
            </Link>
          </div>
        </section>
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}

export function LegalList({ children }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-[#B28A17]">{children}</ul>
}

export function LegalContact({ profile }) {
  return (
    <p>
      Contact us
      {profile.email ? <>{' at '}<a className="font-semibold text-[#8B1E1E] underline decoration-[#D4A017]/50 underline-offset-4" href={`mailto:${profile.email}`}>{profile.email}</a></> : null}
      {profile.address ? `${profile.email ? ' or' : ''} at ${profile.address}.` : '.'}
    </p>
  )
}
