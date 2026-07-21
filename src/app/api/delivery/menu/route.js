import { DELIVERY_CONFIG, getDeliveryAvailability } from "@/lib/deliveryConfig";
import { prisma } from "@/lib/prisma";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [items, restaurantData] = await Promise.all([prisma.menuItem.findMany({
      where: { isActive: true, deliverable: true, category: { isActive: true } },
      orderBy: [{ category: { title: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        description: true,
        price: true,
        image: true,
        category: { select: { title: true, slug: true } },
        tag: { select: { label: true } },
      },
    }), getRestaurantProfileData()]);

    return Response.json({
      data: items.map((item) => ({
        id: item.slug,
        name: item.name,
        description: item.description || "",
        price: Number(item.price),
        image: item.image,
        category: item.category.title,
        categorySlug: item.category.slug,
        tag: item.tag?.label || "",
      })),
      config: {
        currency: DELIVERY_CONFIG.currency,
        nearbyDeliveryFee: DELIVERY_CONFIG.nearbyFeeCents / 100,
        fartherDeliveryFee: DELIVERY_CONFIG.fartherFeeCents / 100,
        availability: getDeliveryAvailability(restaurantData.openingHours),
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/delivery/menu", error);
    return Response.json({ error: "Delivery menu is temporarily unavailable." }, { status: 500 });
  }
}
