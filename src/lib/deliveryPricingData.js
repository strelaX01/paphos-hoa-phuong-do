import { DELIVERY_CONFIG } from "@/lib/deliveryConfig";
import { prisma } from "@/lib/prisma";

export function normalizeDeliveryPricing(settings) {
  const nearbyFeeCents = Math.round(Number(settings?.nearbyDeliveryFee ?? DELIVERY_CONFIG.nearbyFeeCents / 100) * 100);
  const fartherFeeCents = Math.round(Number(settings?.fartherDeliveryFee ?? DELIVERY_CONFIG.fartherFeeCents / 100) * 100);
  const freeDeliveryMinimumCents = Math.round(Number(settings?.freeDeliveryMinimum ?? 20) * 100);

  return {
    currency: DELIVERY_CONFIG.currency,
    nearbyFeeCents,
    fartherFeeCents,
    nearbyDeliveryFee: nearbyFeeCents / 100,
    fartherDeliveryFee: fartherFeeCents / 100,
    freeDeliveryEnabled: settings?.freeDeliveryEnabled === true,
    freeDeliveryMaxKm: Number(settings?.freeDeliveryMaxKm ?? 2),
    freeDeliveryMinimumCents,
    freeDeliveryMinimum: freeDeliveryMinimumCents / 100,
  };
}

export async function getDeliveryPricingData() {
  const settings = await prisma.storefrontSettings.findUnique({
    where: { id: "default" },
    select: { nearbyDeliveryFee: true, fartherDeliveryFee: true, freeDeliveryEnabled: true, freeDeliveryMaxKm: true, freeDeliveryMinimum: true },
  });
  return normalizeDeliveryPricing(settings);
}
