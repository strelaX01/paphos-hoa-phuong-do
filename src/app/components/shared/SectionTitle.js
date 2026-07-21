/**
 * SectionTitle — Reusable section heading component
 * Server Component (no interactivity needed)
 */
export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  light = false,
}) {
  const alignClass = {
    center: 'text-center items-center',
    left: 'text-left items-start',
    right: 'text-right items-end',
  }[align]

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {eyebrow && (
        <span
          className={`text-xs font-semibold tracking-[0.2em] uppercase ${
            light ? 'text-white/80' : 'text-[#D4A017]'
          }`}
        >
          {eyebrow}
        </span>
      )}

      <h2
        className={`font-display font-bold leading-tight ${
          light ? 'text-white' : 'text-[#2B2B2B]'
        } text-3xl sm:text-4xl lg:text-5xl`}
      >
        {title}
      </h2>

      {/* Decorative line */}
      <div
        className={`h-0.5 w-14 rounded-full bg-gradient-to-r from-[#8B1E1E] to-[#D4A017] ${
          align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : ''
        }`}
      />

      {subtitle && (
        <p
          className={`text-base sm:text-lg max-w-2xl leading-relaxed ${
            light ? 'text-white/80' : 'text-[#6B6560]'
          } ${align === 'center' ? 'mx-auto' : ''}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
