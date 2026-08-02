import { getDeliveryPricingData } from "@/lib/deliveryPricingData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pricing = await getDeliveryPricingData();
    return Response.json({ data: pricing }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/delivery/config", error);
    return Response.json({ error: "Delivery pricing is temporarily unavailable." }, { status: 500 });
  }
}
