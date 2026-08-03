import { randomBytes } from "node:crypto";

import { buildDeliveryFeeConsentText, centsToMoney, getDeliveryAvailability, getDeliveryAvailabilityMessage } from "@/lib/deliveryConfig";
import { normalizeDeliveryPricing } from "@/lib/deliveryPricingData";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateDeliveryOrderInput } from "@/lib/validations/deliveryOrder";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { key: "public-delivery-order", limit: 5, windowMs: 15 * 60 * 1000 };
const MAX_BODY_BYTES = 32 * 1024;

function json(payload, status, rateHeaders = {}) {
  return Response.json(payload, { status, headers: { ...rateHeaders, "Cache-Control": "no-store" } });
}

function createOrderNumber() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()).replaceAll("-", "");
  return `HPD-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function sameItems(previousItems, pricedItems) {
  if (previousItems.length !== pricedItems.length) return false;
  const expected = new Map(pricedItems.map((item) => [`${item.menuItemId}:${item.variantId || "base"}`, `${item.quantity}:${item.note || ""}`]));
  return previousItems.every((item) => expected.get(`${item.menuItemId}:${item.variantId || "base"}`) === `${item.quantity}:${item.note || ""}`);
}

async function createOrder(data, pricedItems, totals) {
  return prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findFirst({ where: { phone: data.phone }, orderBy: { updatedAt: "desc" } });
    if (customer) {
      customer = await tx.customer.update({ where: { id: customer.id }, data: { name: data.name, ...(data.email ? { email: data.email } : {}) } });
    } else {
      customer = await tx.customer.create({ data: { name: data.name, email: data.email, phone: data.phone } });
    }

    let address = await tx.customerAddress.findFirst({ where: { customerId: customer.id, street: data.street, zone: data.area } });
    if (!address) {
      address = await tx.customerAddress.create({ data: { customerId: customer.id, street: data.street, zone: data.area, city: data.area, notes: data.notes } });
    }

    return tx.order.create({
      data: {
        orderNumber: createOrderNumber(),
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
        deliveryFeeConsentAt: new Date(),
        deliveryFeeConsentText: totals.deliveryFeeConsentText,
        deliveryFeePolicyNearby: centsToMoney(totals.nearbyFeeCents),
        deliveryFeePolicyFarther: centsToMoney(totals.fartherFeeCents),
        subtotal: centsToMoney(totals.subtotalCents),
        deliveryFee: centsToMoney(totals.deliveryFeeCents),
        total: centsToMoney(totals.totalCents),
        items: { create: pricedItems.map((item) => ({ menuItemId: item.menuItemId, variantId: item.variantId, variantLabel: item.variantLabel, name: item.name, note: item.note, quantity: item.quantity, unitPrice: centsToMoney(item.unitPriceCents), lineTotal: centsToMoney(item.lineTotalCents) })) },
        timeline: { create: { status: "PENDING", title: "Order received", note: "Waiting for restaurant confirmation." } },
      },
      select: { id: true, orderNumber: true, status: true, subtotal: true, deliveryFee: true, total: true, deliveryFeeConsentAt: true, createdAt: true },
    });
  });
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT);
  if (!rate.allowed) return json({ error: "Too many order attempts. Please try again later." }, 429, rate.headers);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Request body is too large." }, 413, rate.headers);

  let body;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "Request body is too large." }, 413, rate.headers);
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body." }, 400, rate.headers);
  }

  if (typeof body?.website === "string" && body.website.trim()) return json({ data: { reference: "RECEIVED", status: "PENDING" } }, 201, rate.headers);
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
    }), prisma.storefrontSettings.findUnique({ where: { id: "default" }, select: { nearbyDeliveryFee: true, fartherDeliveryFee: true } })]);
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
    const deliveryFeeCents = pricing.nearbyFeeCents;
    const totals = { subtotalCents, deliveryFeeCents, totalCents: subtotalCents + deliveryFeeCents, nearbyFeeCents: pricing.nearbyFeeCents, fartherFeeCents: pricing.fartherFeeCents, deliveryFeeConsentText: buildDeliveryFeeConsentText(pricing.nearbyFeeCents, pricing.fartherFeeCents) };

    const duplicateSince = new Date(Date.now() - 2 * 60 * 1000);
    const recentOrders = await prisma.order.findMany({
      where: { customerPhone: validation.data.phone, createdAt: { gte: duplicateSince }, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, status: true, subtotal: true, deliveryFee: true, total: true, deliveryStreet: true, deliveryZone: true, deliveryFeeConsentAt: true, items: { select: { menuItemId: true, variantId: true, quantity: true, note: true } } },
    });
    const duplicate = recentOrders.find((order) => order.deliveryStreet === validation.data.street && order.deliveryZone === validation.data.area && Math.round(Number(order.subtotal) * 100) === subtotalCents && Math.round(Number(order.deliveryFee) * 100) === deliveryFeeCents && sameItems(order.items, pricedItems));
    if (duplicate) {
      if (!duplicate.deliveryFeeConsentAt) {
        await prisma.order.update({
          where: { id: duplicate.id },
          data: { deliveryFeeConsentAt: new Date(), deliveryFeeConsentText: totals.deliveryFeeConsentText, deliveryFeePolicyNearby: centsToMoney(pricing.nearbyFeeCents), deliveryFeePolicyFarther: centsToMoney(pricing.fartherFeeCents) },
        });
      }
      return json({ data: { reference: duplicate.orderNumber, status: duplicate.status, subtotal: Number(duplicate.subtotal), deliveryFee: Number(duplicate.deliveryFee), total: Number(duplicate.total), duplicate: true } }, 200, rate.headers);
    }

    let order;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        order = await createOrder(validation.data, pricedItems, totals);
        break;
      } catch (error) {
        if (error.code !== "P2002" || attempt === 2) throw error;
      }
    }

    return json({ data: { reference: order.orderNumber, status: order.status, subtotal: Number(order.subtotal), deliveryFee: Number(order.deliveryFee), total: Number(order.total), createdAt: order.createdAt } }, 201, rate.headers);
  } catch (error) {
    console.error("POST /api/orders", error);
    return json({ error: "Could not place the order. Please call the restaurant or try again." }, 500, rate.headers);
  }
}
