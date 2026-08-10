import Image from 'next/image'
import Link from 'next/link'

/**
 * AboutSection — Storytelling 50/50 split
 * Server Component
 */
export default function AboutSection() {
  const pillars = [
    { label: 'Family recipes', detail: 'Passed down through three generations' },
    { label: 'Made fresh daily', detail: 'From Cypriot markets and Vietnamese suppliers' },
    { label: 'Genuine hospitality', detail: 'Every guest welcomed as a friend' },
  ]

  return (
    <section
      id="about"
      aria-label="About Hoa Phuong Do"
      className="bg-[#F2EAD8] overflow-hidden"
    >
      <div className="site-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">

          {/* ── Image side ─────────────────────────────────── */}
          <div data-home-reveal="image-left" className="relative min-h-[380px] lg:min-h-[600px] order-2 lg:order-1 lg:-ml-6">
            <Image
              src="/images/hpd3.png"
              alt="Intimate dining room at Hoa Phượng Đỏ restaurant"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {/* Right fade to blend with content area */}
            <div className="absolute inset-0 lg:bg-gradient-to-r lg:from-transparent lg:to-[#F2EAD8]/80" />

            {/* Floating stat */}
            <div className="absolute bottom-8 left-8 bg-[#F8F3EA] p-5 shadow-sm">
              <p className="font-display font-bold text-[#8B1E1E] text-5xl leading-none mb-1">10+</p>
              <p className="text-[11px] text-[#9C9489] tracking-[0.15em] uppercase leading-snug">Years of<br />Vietnamese tradition</p>
            </div>
          </div>

          {/* ── Content side ───────────────────────────────── */}
          <div data-home-reveal="rise" className="order-1 lg:order-2 py-16 lg:py-20 lg:pl-14 xl:pl-20 flex flex-col justify-center">
            <span className="block text-[#D4A017] text-[11px] font-semibold tracking-[0.3em] uppercase mb-4">
              Our Story
            </span>
            <h2 className="font-display font-bold text-[#2B2B2B] text-3xl sm:text-4xl lg:text-[42px] leading-[1.1] mb-4">
              A Taste of Vietnam<br />
              in the Heart of{' '}
              <span className="text-[#8B1E1E]">Cyprus</span>
            </h2>

            <div className="h-px w-10 bg-gradient-to-r from-[#8B1E1E] to-[#D4A017] mb-6" />

            <div className="space-y-4 text-[#6B6560] text-[15px] leading-relaxed mb-8">
              <p>
                Hoa Phuong Do — the Red Flamboyant — was born from a simple dream: to share the soul of Vietnamese cuisine. Named after the striking flamboyant tree that blooms across Vietnam each summer, our restaurant carries the same warmth.
              </p>
              <p>
                Our chefs bring decades of family recipes — from the highlands of the North to the streets of Saigon. Every dish is made fresh daily, with genuine care for our guests.
              </p>
            </div>

            {/* Pillars */}
            <ul className="space-y-4 mb-8">
              {pillars.map((p, i) => (
                <li key={i} data-home-reveal="rise" className="flex items-start gap-4" style={{ '--home-reveal-delay': `${i * 70}ms` }}>
                  <span className="flex-shrink-0 mt-1 w-4 h-4 rounded-full border border-[#D4A017]/50 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017]" />
                  </span>
                  <div>
                    <p className="text-[#2B2B2B] text-[14px] font-semibold">{p.label}</p>
                    <p className="text-[#9C9489] text-[13px]">{p.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.2em] uppercase text-[#8B1E1E] border-b border-[#8B1E1E]/30 pb-0.5 hover:border-[#8B1E1E] transition-colors duration-200 group self-start"
            >
              Find Us
              <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
