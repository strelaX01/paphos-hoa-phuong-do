import { randomBytes } from "node:crypto";

import { buildDeliveryFeeConsentText, centsToMoney, getDeliveryAvailability, getDeliveryAvailabilityMessage } from "@/lib/deliveryConfig";
import { normalizeDeliveryPricing } from "@/lib/deliveryPricingData";
import { DeliveryRoutingError, quoteDeliveryRoute } from "@/lib/deliveryRouting";
import { checkPublicWriteRateLimit } from "@/lib/authRateLimit";
import { prisma } from "@/lib/prisma";
import { readLimitedJson } from "@/lib/readLimitedJson";
import { validateDeliveryOrderInput } from "@/lib/validations/deliveryOrder";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { namespace: "public-delivery-order", limit: 5, windowMs: 15 * 60 * 1000 };
const MAX_BODY_BYTES = 32 * 1024;
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

function json(payload, status, rateHeaders = {}) {
  return Response.json(payload, { status, headers: { ...rateHeaders, "Cache-Control": "no-store" } });
}

function createOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()).replaceAll("-", "");
  return `HPD-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

async function createOrder(data, pricedItems, totals, idempotencyKey) {
  return prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findFirst({ where: { phone: data.phone }, orderBy: { updatedAt: "desc" } });
    if (customer) {
      customer = await tx.customer.update({ where: { id: customer.id }, data: { name: data.name, ...(data.email ? { email: data.email } : {}) } });
    } else {
      customer = await tx.customer.create({ data: { name: data.name, email: data.email, phone: data.phone } });
    }

    let address = await tx.customerAddress.findFirst({ where: { customerId: customer.id, street: data.street, zone: data.area } });
    if (!address) address = await tx.customerAddress.create({ data: { customerId: customer.id, street: data.street, zone: data.area, city: data.area, notes: data.notes, latitude: data.latitude, longitude: data.longitude } });
    else address = await tx.customerAddress.update({ where: { id: address.id }, data: { notes: data.notes, latitude: data.latitude, longitude: data.longitude } });

    return tx.order.create({
      data: {
        orderNumber: createOrderNumber(),
        idempotencyKey,
        status: "PENDING",
        paymentMethod: "CASH",
        paymentStatus: "PENDING",
        customerId: customer.id,
        addressId: address.id,
        customerName: data.name,
        customerPhone: data.phone,
        customerEmail: data.email,
        deliveryStreet: data.street,
        deliveryZone: data.area,
        deliveryNotes: data.notes,
        deliveryLatitude: data.latitude,
        deliveryLongitude: data.longitude,
        deliveryFeeConsentAt: new Date(),
        deliveryFeeConsentText: totals.deliveryFeeConsentText,
        deliveryFeePolicyNearby: centsToMoney(totals.nearbyFeeCents),
        deliveryFeePolicyFarther: centsToMoney(totals.fartherFeeCents),
        subtotal: centsToMoney(totals.subtotalCents),
        distanceKm: totals.routeQuote?.distanceKm,
        etaMinutes: totals.routeQuote?.etaMinutes,
        deliveryFee: centsToMoney(totals.deliveryFeeCents),
        total: centsToMoney(totals.subtotalCents + totals.deliveryFeeCents),
        items: { create: pricedItems.map((item) => ({ menuItemId: item.menuItemId, variantId: item.variantId, variantLabel: item.variantLabel, name: item.name, note: item.note, quantity: item.quantity, unitPrice: centsToMoney(item.unitPriceCents), lineTotal: centsToMoney(item.lineTotalCents) })) },
        timeline: { create: { status: "PENDING", title: "Order received", note: "Waiting for restaurant confirmation." } },
      },
      select: { id: true, orderNumber: true, status: true, subtotal: true, deliveryFee: true, total: true, deliveryFeeConsentAt: true, createdAt: true },
    });
  });
}

export async function POST(request) {
  const rate = await checkPublicWriteRateLimit(request, RATE_LIMIT);
  if (!rate.allowed) return json({ error: "Too many order attempts. Please try again later." }, 429, rate.headers);

  const parsed = await readLimitedJson(request, MAX_BODY_BYTES);
  if (parsed.error) return json({ error: parsed.error }, parsed.status, rate.headers);
  const body = parsed.data;
  const idempotencyKey = (request.headers.get("idempotency-key") || "").trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return json({ error: "A valid idempotency key is required." }, 400, rate.headers);
  }

  if (typeof body?.website === "string" && body.website.trim()) return json({ data: { reference: "RECEIVED", status: "PENDING" } }, 201, rate.headers);

  try {
    const existingRequest = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: { orderNumber: true, status: true, subtotal: true, deliveryFee: true, total: true, distanceKm: true },
    });
    if (existingRequest) {
      const deliveryFeeConfirmed = existingRequest.distanceKm !== null;
      return json({ data: { reference: existingRequest.orderNumber, status: existingRequest.status, subtotal: Number(existingRequest.subtotal), deliveryFee: deliveryFeeConfirmed ? Number(existingRequest.deliveryFee) : null, total: deliveryFeeConfirmed ? Number(existingRequest.total) : null, deliveryFeeConfirmed, duplicate: true } }, 200, rate.headers);
    }
  } catch (error) {
    console.error("Failed to check order idempotency", error);
    return json({ error: "Could not verify this order request. Please try again." }, 503, rate.headers);
  }

  const validation = validateDeliveryOrderInput(body);
  if (!validation.isValid) return json({ errors: validation.errors }, 422, rate.headers);

  const { openingHours } = await getRestaurantProfileData();
  const availability = getDeliveryAvailability(openingHours);
  if (!availability.isOpen) {
    return json({ error: getDeliveryAvailabilityMessage(availability) }, 409, rate.headers);
  }

  try {
    const slugs = validation.data.items.map((item) => item.slug);
    const [menuItems, storefrontSettings] = await Promise.all([prisma.menuItem.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        isActive: true,
        deliverable: true,
        category: { select: { isActive: true } },
        variants: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          select: { id: true, label: true, price: true },
        },
      },
    }), prisma.storefrontSettings.findUnique({ where: { id: "default" }, select: { nearbyDeliveryFee: true, fartherDeliveryFee: true, freeDeliveryEnabled: true, freeDeliveryMaxKm: true, freeDeliveryMinimum: true } })]);
    const pricing = normalizeDeliveryPricing(storefrontSettings);
    if (validation.data.acceptedNearbyFeeCents !== pricing.nearbyFeeCents || validation.data.acceptedFartherFeeCents !== pricing.fartherFeeCents) {
      return json({ error: "Delivery fees changed while you were checking out. Review and accept the updated fees.", code: "DELIVERY_PRICING_CHANGED", deliveryPricing: pricing }, 409, rate.headers);
    }
    const menuBySlug = new Map(menuItems.map((item) => [item.slug, item]));
    const unavailable = validation.data.items.filter((item) => {
      const menuItem = menuBySlug.get(item.slug);
      if (!menuItem || !menuItem.isActive || !menuItem.deliverable || !menuItem.category.isActive) return true;
      if (menuItem.variants.length) return !item.variantId || !menuItem.variants.some((variant) => variant.id === item.variantId);
      return Boolean(item.variantId);
    }).map((item) => `${item.slug}:${item.variantId || "base"}`);
    if (unavailable.length) return json({ error: "Some dishes are no longer available. Refresh the menu and review your cart.", unavailableItems: unavailable }, 409, rate.headers);

    const pricedItems = validation.data.items.map((item) => {
      const menuItem = menuBySlug.get(item.slug);
      const variant = item.variantId ? menuItem.variants.find((entry) => entry.id === item.variantId) : null;
      const unitPriceCents = Math.round(Number(variant?.price ?? menuItem.price) * 100);
      return {
        menuItemId: menuItem.id,
        variantId: variant?.id || null,
        variantLabel: variant?.label || null,
        name: menuItem.name,
        quantity: item.quantity,
        note: item.note,
        unitPriceCents,
        lineTotalCents: unitPriceCents * item.quantity,
      };
    });
    const subtotalCents = pricedItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
    let routeQuote = null;
    try {
      routeQuote = await quoteDeliveryRoute(
        { latitude: validation.data.latitude, longitude: validation.data.longitude },
        { subtotalCents },
      );
    } catch (error) {
      const canUseManualFallback = validation.data.routingMode === "manual" && error instanceof DeliveryRoutingError && ["ROUTING_UNAVAILABLE", "ROUTING_RATE_LIMITED"].includes(error.code);
      if (!canUseManualFallback) {
        const status = error instanceof DeliveryRoutingError ? error.status : 503;
        return json({ error: error.message || "The delivery route could not be calculated.", code: error.code || "ROUTING_UNAVAILABLE" }, status, rate.headers);
      }
    }
    if (routeQuote && validation.data.acceptedDeliveryFeeCents !== routeQuote.feeCents) {
      return json({ error: "The delivery route or fee changed. Review the updated quote before ordering.", code: "DELIVERY_QUOTE_CHANGED", deliveryQuote: routeQuote }, 409, rate.headers);
    }
    const deliveryFeeCents = routeQuote?.feeCents || 0;
    const deliveryFeeConsentText = routeQuote
      ? `I agree to the calculated delivery fee of EUR ${centsToMoney(deliveryFeeCents)} for the ${routeQuote.distanceKm.toFixed(1)} km route to my confirmed delivery pin.`
      : buildDeliveryFeeConsentText(pricing.nearbyFeeCents, pricing.fartherFeeCents);
    const totals = { subtotalCents, deliveryFeeCents, routeQuote, nearbyFeeCents: pricing.nearbyFeeCents, fartherFeeCents: pricing.fartherFeeCents, deliveryFeeConsentText };

    let order;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        order = await createOrder(validation.data, pricedItems, totals, idempotencyKey);
        break;
      } catch (error) {
        if (error.code !== "P2002") throw error;
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
          select: { id: true, orderNumber: true, status: true, subtotal: true, deliveryFee: true, total: true, deliveryFeeConsentAt: true, distanceKm: true, createdAt: true },
        });
        if (existing) {
          order = existing;
          break;
        }
        if (attempt === 2) throw error;
      }
    }

    const deliveryFeeConfirmed = Boolean(routeQuote);
    return json({ data: { reference: order.orderNumber, status: order.status, subtotal: Number(order.subtotal), deliveryFee: deliveryFeeConfirmed ? Number(order.deliveryFee) : null, total: deliveryFeeConfirmed ? Number(order.total) : null, deliveryFeeConfirmed, createdAt: order.createdAt } }, 201, rate.headers);
  } catch (error) {
    console.error("POST /api/orders", error);
    return json({ error: "Could not place the order. Please call the restaurant or try again." }, 500, rate.headers);
  }
}
