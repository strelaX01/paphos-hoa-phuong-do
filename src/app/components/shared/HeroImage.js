import Image from 'next/image'

const HERO_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Crect width='8' height='5' fill='%231E1A18'/%3E%3C/svg%3E"

export default function HeroImage({ alt, sizes = '100vw', ...props }) {
  return (
    <Image
      {...props}
      alt={alt}
      fill
      preload
      placeholder={HERO_PLACEHOLDER}
      sizes={sizes}
    />
  )
}
