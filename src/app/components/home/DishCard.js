import Image from 'next/image'

/**
 * DishCard — Premium menu preview card
 * Server Component
 */
export default function DishCard({ dish, index }) {
  return (
    <article data-home-reveal="rise" className="group flex flex-col" style={{ '--home-reveal-delay': `${Math.min(index, 3) * 75}ms` }}>
      {/* Image */}
      <div className="relative overflow-hidden aspect-[4/3] bg-[#E8DFC8] mb-4">
        <Image
          src={dish.image}
          alt={dish.name}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Very subtle hover darken */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/8 transition-colors duration-400" />

      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Vietnamese name + price */}
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <h3 className="font-display font-bold text-[#2B2B2B] text-[17px] leading-snug group-hover:text-[#8B1E1E] transition-colors duration-200">
            {dish.name}
          </h3>
          <span className="font-sans font-semibold tabular-nums text-[#8B1E1E] text-[14px] flex-shrink-0" style={{ lineHeight: 1 }}>
            {dish.price}
          </span>
        </div>



        {/* Rule */}
        <div className="h-px bg-[#E8DFC8] mb-3" />

        {/* Description */}
        <p className="text-[#6B6560] text-[13px] leading-relaxed line-clamp-2">
          {dish.description}
        </p>
      </div>
    </article>
  )
}
