import { createRestaurantJsonLd } from '@/lib/seo'

export default function RestaurantJsonLd({ restaurantData }) {
  const jsonLd = createRestaurantJsonLd(restaurantData)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
