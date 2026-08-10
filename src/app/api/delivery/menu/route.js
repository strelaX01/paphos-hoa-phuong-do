import { getDeliveryAvailability } from "@/lib/deliveryConfig";
import { listPublicMenuSections } from "@/lib/publicMenuData";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";
import { getDeliveryPricingData } from "@/lib/deliveryPricingData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [sections, restaurantData, pricing] = await Promise.all([
      listPublicMenuSections({ deliverableOnly: true }),
      getRestaurantProfileData(),
      getDeliveryPricingData(),
    ]);

    const items = sections.flatMap((section) => section.items.map((item) => ({
      ...item,
      category: section.title,
      categorySlug: section.slug,
    })));

    return Response.json({
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category,
        categorySlug: item.categorySlug,
        variants: item.variants,
      })),
      config: {
        currency: pricing.currency,
        nearbyDeliveryFee: pricing.nearbyDeliveryFee,
        fartherDeliveryFee: pricing.fartherDeliveryFee,
        freeDeliveryEnabled: pricing.freeDeliveryEnabled,
        freeDeliveryMaxKm: pricing.freeDeliveryMaxKm,
        freeDeliveryMinimum: pricing.freeDeliveryMinimum,
        availability: getDeliveryAvailability(restaurantData.openingHours),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/delivery/menu", error);
    return Response.json({ error: "Delivery menu is temporarily unavailable." }, { status: 500 });
  }
}
