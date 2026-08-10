import { CookingPot, HandHeart, Sprout } from 'lucide-react'

const promises = [
  {
    icon: CookingPot,
    title: 'Prepared to order',
    text: 'Dishes leave the kitchen fresh, hot, and made for the table in front of us.',
  },
  {
    icon: Sprout,
    title: 'Fresh ingredients',
    text: 'Herbs, vegetables, broths, and sauces come together with balance and care.',
  },
  {
    icon: HandHeart,
    title: 'Warm hospitality',
    text: 'Whether dining in or ordering home, every meal receives the same attention.',
  },
]

export default function DiningPromiseSection() {
  return (
    <section
      id="dining-promise"
      aria-label="Our dining promise"
      className="bg-[#F2EAD8] py-18 lg:py-24"
    >
      <div className="site-container">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div data-home-reveal="rise">
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Our Promise
            </span>
            <h2 className="font-display text-3xl font-bold leading-[1.1] text-[#2B2B2B] sm:text-4xl lg:text-[44px]">
              Vietnamese cooking, served with genuine care.
            </h2>
            <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-[#6B6560]">
              A simple approach guides every service: cook attentively, serve generously, and make guests feel at ease.
            </p>
          </div>

          <div className="divide-y divide-[#D8CBAE] border-y border-[#D8CBAE]">
            {promises.map(({ icon: Icon, title, text }, index) => (
              <div key={title} data-home-reveal="from-right" className="grid gap-4 py-6 sm:grid-cols-[auto_0.7fr_1.3fr] sm:items-center" style={{ '--home-reveal-delay': `${index * 80}ms` }}>
                <span className="flex size-11 items-center justify-center bg-[#8B1E1E] text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="font-display text-xl font-bold text-[#2B2B2B]">{title}</h3>
                <p className="text-[13px] leading-relaxed text-[#6B6560]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
