import Image from "next/image"

export default function AdminAuthCard({ children, eyebrow, title, description }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <Image src="/images/hpd-hero.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/58" />

      <section className="relative z-10 w-full max-w-md rounded-lg border border-white/20 bg-[#FDFBF7] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-4 border-b border-[#E4DAC9] pb-5">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-[#E4DAC9] bg-white">
            <Image
              src="/images/hoa-phuong-do-logo.png"
              alt="Hoa Phuong Do"
              fill
              sizes="64px"
              className="object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B1E1E]">{eyebrow}</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#202020]">{title}</h1>
            {description ? <p className="mt-1 text-sm text-[#756D62]">{description}</p> : null}
          </div>
        </div>

        {children}
      </section>
    </main>
  )
}
