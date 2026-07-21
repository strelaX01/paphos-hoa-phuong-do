import { getCurrentAdminAccount } from "@/lib/adminAuth";
import { orderAdminSelect, orderDriverSelect, serializeAdminOrder, serializeDriverOrder } from "@/lib/orderAdminData";
import { DELIVERY_CONFIG } from "@/lib/deliveryConfig";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "ASSIGNED", "PENDING_PICKUP", "PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"];
const NEXT_STATUSES = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PENDING_PICKUP", "CANCELLED"],
  ASSIGNED: ["PENDING_PICKUP", "PICKED_UP", "CANCELLED"],
  PENDING_PICKUP: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["EN_ROUTE"],
  EN_ROUTE: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
const STATUS_TITLES = {
  CONFIRMED: "Order confirmed",
  PREPARING: "Kitchen started preparing",
  PENDING_PICKUP: "Ready for pickup",
  PICKED_UP: "Order picked up",
  EN_ROUTE: "Driver en route",
  DELIVERED: "Order delivered",
  CANCELLED: "Order cancelled",
};
const FULL_EDIT_STATUSES = ["PENDING", "CONFIRMED"];
const DELIVERY_EDIT_STATUSES = [...FULL_EDIT_STATUSES, "PREPARING", "ASSIGNED", "PENDING_PICKUP"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]+$/;

function text(value, maximum) {
  return typeof value === "string" ? value.trim().slice(0, maximum + 1) : "";
}

function validateOrderEdit(edit, allowFullEdit) {
  const errors = [];
  const deliveryStreet = text(edit?.deliveryStreet, 200);
  const deliveryZone = text(edit?.deliveryZone, 100);
  const deliveryNotes = text(edit?.deliveryNotes, 1000);
  if (deliveryStreet.length < 5 || deliveryStreet.length > 200) errors.push("Enter a delivery address between 5 and 200 characters.");
  if (deliveryZone.length < 2 || deliveryZone.length > 100) errors.push("Enter an area between 2 and 100 characters.");
  if (deliveryNotes.length > 1000) errors.push("Delivery notes must be 1000 characters or fewer.");

  const data = { deliveryStreet, deliveryZone, deliveryNotes: deliveryNotes || null };
  if (!allowFullEdit) return { data, errors };

  const customerName = text(edit?.customerName, 100);
  const customerEmail = text(edit?.customerEmail, 254).toLowerCase();
  const rawPhone = text(edit?.customerPhone, 30);
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const customerPhone = rawPhone.startsWith("+") ? `+${phoneDigits}` : phoneDigits;
  if (customerName.length < 2 || customerName.length > 100) errors.push("Customer name must be between 2 and 100 characters.");
  if (customerEmail && (!EMAIL_PATTERN.test(customerEmail) || customerEmail.length > 254)) errors.push("Enter a valid customer email address.");
  if (!PHONE_PATTERN.test(rawPhone) || phoneDigits.length < 6 || phoneDigits.length > 15) errors.push("Enter a valid phone number using 6 to 15 digits.");

  const rawItems = Array.isArray(edit?.items) ? edit.items : [];
  if (!rawItems.length) errors.push("An order must contain at least one dish.");
  if (rawItems.length > DELIVERY_CONFIG.maxDistinctItems) errors.push(`An order can contain at most ${DELIVERY_CONFIG.maxDistinctItems} dishes.`);
  const seen = new Set();
  let totalQuantity = 0;
  const items = rawItems.map((item) => {
    const id = typeof item?.id === "string" ? item.id.trim() : "";
    const quantity = Number(item?.quantity);
    const note = text(item?.note, 300);
    if (!id || seen.has(id)) errors.push("Order items are invalid or duplicated.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > DELIVERY_CONFIG.maxItemQuantity) errors.push(`Each quantity must be between 1 and ${DELIVERY_CONFIG.maxItemQuantity}.`);
    if (note.length > 300) errors.push("Item notes must be 300 characters or fewer.");
    seen.add(id);
    totalQuantity += Number.isInteger(quantity) ? quantity : 0;
    return { id, quantity, note: note || null };
  });
  if (totalQuantity > DELIVERY_CONFIG.maxTotalQuantity) errors.push(`An order can contain at most ${DELIVERY_CONFIG.maxTotalQuantity} total items.`);

  return { data: { ...data, customerName, customerEmail: customerEmail || null, customerPhone, items }, errors };
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function cyprusDayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  const start = new Date(`${read("year")}-${read("month")}-${read("day")}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export async function GET(request) {
  const account = await getCurrentAdminAccount();
  if (!account) return Response.json({ error: "Authentication required." }, { status: 401 });
  const isDriver = account.role === "DRIVER";
  const { searchParams } = new URL(request.url);
  if (searchParams.get("summaryOnly") === "1") {
    try {
      const [pending, latest] = await prisma.$transaction([
        prisma.order.count({ where: { status: isDriver ? "PENDING_PICKUP" : "PENDING" } }),
        prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      ]);
      return Response.json({
        data: { pending, latestCreatedAt: latest?.createdAt.toISOString() || null },
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("GET /api/admin/orders summary", error);
      return Response.json({ error: "Failed to load order count." }, { status: 500 });
    }
  }

  const page = positiveInteger(searchParams.get("page"), 1, 100000);
  const limit = positiveInteger(searchParams.get("limit"), 12, 100);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  if (status && !STATUSES.includes(status)) return Response.json({ error: "Invalid order status." }, { status: 422 });
  const where = {
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { orderNumber: { contains: query, mode: "insensitive" } },
      { customerName: { contains: query, mode: "insensitive" } },
      { customerPhone: { contains: query, mode: "insensitive" } },
      { deliveryStreet: { contains: query, mode: "insensitive" } },
    ] } : {}),
  };

  try {
    const today = cyprusDayRange();
    const [orders, total, pending, kitchen, delivery, ready] = await prisma.$transaction([
      prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, select: isDriver ? orderDriverSelect : orderAdminSelect }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: { in: ["CONFIRMED", "PREPARING", "ASSIGNED", "PENDING_PICKUP"] } } }),
      prisma.order.count({ where: { status: { in: ["PICKED_UP", "EN_ROUTE"] } } }),
      prisma.order.count({ where: { status: "PENDING_PICKUP" } }),
    ]);
    const todayRevenue = isDriver
      ? 0
      : Number((await prisma.order.aggregate({ where: { createdAt: today, status: { not: "CANCELLED" } }, _sum: { total: true } }))._sum.total || 0);
    return Response.json({
      data: orders.map(isDriver ? serializeDriverOrder : serializeAdminOrder),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: { pending, kitchen, delivery, ready, ...(isDriver ? {} : { todayRevenue }) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders", error);
    return Response.json({ error: "Failed to load orders." }, { status: 500 });
  }
}

export async function PATCH(request) {
  const account = await getCurrentAdminAccount();
  if (!account) return Response.json({ error: "Authentication required." }, { status: 401 });
  const isDriver = account.role === "DRIVER";
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const nextStatus = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  const hasDriver = Object.prototype.hasOwnProperty.call(body || {}, "driverId");
  const hasDeliveryFee = Object.prototype.hasOwnProperty.call(body || {}, "deliveryFee");
  const hasEdit = Object.prototype.hasOwnProperty.call(body || {}, "edit");
  const deliveryFee = Number(body?.deliveryFee);
  const deliveryFeeCents = Math.round(deliveryFee * 100);
  if (!id) return Response.json({ error: "Order ID is required." }, { status: 422 });
  if (nextStatus && !STATUSES.includes(nextStatus)) return Response.json({ error: "Invalid order status." }, { status: 422 });
  if (hasDriver) return Response.json({ error: "Driver assignment is not supported." }, { status: 422 });
  if (hasDeliveryFee && ![3, 3.5].includes(deliveryFee)) {
    return Response.json({ error: "Delivery fee must be either €3.00 or €3.50." }, { status: 422 });
  }
  if (!nextStatus && !hasDeliveryFee && !hasEdit) return Response.json({ error: "Provide a status, delivery fee, or order changes to update." }, { status: 422 });
  if (isDriver && (hasDeliveryFee || hasEdit || hasDriver || !nextStatus)) {
    return Response.json({ error: "Drivers can only update delivery status." }, { status: 403 });
  }
  if (isDriver && !["PICKED_UP", "EN_ROUTE", "DELIVERED"].includes(nextStatus)) {
    return Response.json({ error: "Drivers can only mark orders as picked up, en route, or delivered." }, { status: 403 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        select: { status: true, paymentMethod: true, customerName: true, customerPhone: true, customerEmail: true, deliveryStreet: true, deliveryZone: true, deliveryNotes: true, subtotal: true, discountTotal: true, deliveryFee: true, items: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, note: true, quantity: true, unitPrice: true } } },
      });
      if (!current) return null;
      const allowFullEdit = FULL_EDIT_STATUSES.includes(current.status);
      const allowDeliveryEdit = DELIVERY_EDIT_STATUSES.includes(current.status);
      const editValidation = hasEdit ? validateOrderEdit(body.edit, allowFullEdit) : null;
      if (hasEdit && !allowDeliveryEdit) throw Object.assign(new Error("This order can no longer be edited at its current status."), { code: "ORDER_LOCKED" });
      if (editValidation?.errors.length) throw Object.assign(new Error(editValidation.errors[0]), { code: "INVALID_EDIT" });
      if (hasDeliveryFee && ["PICKED_UP", "EN_ROUTE", "DELIVERED", "CANCELLED"].includes(current.status)) {
        throw Object.assign(new Error("Delivery fee cannot be changed after the order has been picked up, delivered, or cancelled."), { code: "ORDER_LOCKED" });
      }
      if (nextStatus && nextStatus !== current.status && !NEXT_STATUSES[current.status].includes(nextStatus)) throw Object.assign(new Error(`Cannot move an order from ${current.status} to ${nextStatus}.`), { code: "INVALID_TRANSITION" });
      const now = new Date();
      const timestamps = nextStatus ? {
        ...(nextStatus === "CONFIRMED" ? { confirmedAt: now } : {}),
        ...(nextStatus === "PICKED_UP" ? { pickedUpAt: now } : {}),
        ...(nextStatus === "DELIVERED" ? { deliveredAt: now, ...(current.paymentMethod === "CASH" ? { paymentStatus: "PAID" } : {}) } : {}),
        ...(nextStatus === "CANCELLED" ? { cancelledAt: now } : {}),
      } : {};
      const timelineCreates = [];
      if (nextStatus && nextStatus !== current.status) {
        timelineCreates.push({
          status: nextStatus,
          title: STATUS_TITLES[nextStatus],
          note: isDriver ? `Updated by driver ${account.name}.` : null,
        });
      }
      if (hasDeliveryFee && deliveryFeeCents !== Math.round(Number(current.deliveryFee) * 100)) {
        timelineCreates.push({
          title: "Delivery fee updated",
          note: `Changed from €${Number(current.deliveryFee).toFixed(2)} to €${(deliveryFeeCents / 100).toFixed(2)} by admin.`,
        });
      }
      const pricing = hasDeliveryFee ? {
        deliveryFee: (deliveryFeeCents / 100).toFixed(2),
        total: (Number(current.subtotal) - Number(current.discountTotal) + deliveryFeeCents / 100).toFixed(2),
      } : {};
      let editData = {};
      if (hasEdit) {
        const edit = editValidation.data;
        const changedSections = [];
        if (edit.deliveryStreet !== current.deliveryStreet || edit.deliveryZone !== (current.deliveryZone || "") || (edit.deliveryNotes || "") !== (current.deliveryNotes || "")) changedSections.push("delivery details");
        editData = { deliveryStreet: edit.deliveryStreet, deliveryZone: edit.deliveryZone, deliveryNotes: edit.deliveryNotes };

        if (allowFullEdit) {
          if (edit.customerName !== current.customerName || edit.customerPhone !== current.customerPhone || (edit.customerEmail || "") !== (current.customerEmail || "")) changedSections.push("customer details");
          const currentById = new Map(current.items.map((item) => [item.id, item]));
          const submittedIds = new Set(edit.items.map((item) => item.id));
          if (edit.items.some((item) => !currentById.has(item.id))) throw Object.assign(new Error("One or more order items no longer exist."), { code: "INVALID_EDIT" });
          const removedIds = current.items.filter((item) => !submittedIds.has(item.id)).map((item) => item.id);
          const itemChanges = edit.items.filter((item) => {
            const existing = currentById.get(item.id);
            return existing.quantity !== item.quantity || (existing.note || "") !== (item.note || "");
          });
          if (removedIds.length || itemChanges.length) changedSections.push("order items");
          const subtotal = edit.items.reduce((sum, item) => sum + Number(currentById.get(item.id).unitPrice) * item.quantity, 0);
          const itemMutations = {
            ...(removedIds.length ? { deleteMany: { id: { in: removedIds } } } : {}),
            ...(itemChanges.length ? { update: itemChanges.map((item) => ({ where: { id: item.id }, data: { quantity: item.quantity, note: item.note, lineTotal: (Number(currentById.get(item.id).unitPrice) * item.quantity).toFixed(2) } })) } : {}),
          };
          editData = {
            ...editData,
            customerName: edit.customerName,
            customerPhone: edit.customerPhone,
            customerEmail: edit.customerEmail,
            subtotal: subtotal.toFixed(2),
            total: (Math.max(0, subtotal - Number(current.discountTotal)) + (hasDeliveryFee ? deliveryFeeCents / 100 : Number(current.deliveryFee))).toFixed(2),
            ...(removedIds.length || itemChanges.length ? { items: itemMutations } : {}),
          };
        }

        if (!changedSections.length) throw Object.assign(new Error("No order changes were detected."), { code: "INVALID_EDIT" });
        timelineCreates.push({ title: "Order edited", note: `Updated ${changedSections.join(", ")} by admin.` });
      }
      return tx.order.update({
        where: { id },
        data: { ...(nextStatus ? { status: nextStatus } : {}), ...editData, ...pricing, ...timestamps, ...(timelineCreates.length ? { timeline: { create: timelineCreates } } : {}) },
        select: isDriver ? orderDriverSelect : orderAdminSelect,
      });
    });
    if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });
    return Response.json({ data: isDriver ? serializeDriverOrder(updated) : serializeAdminOrder(updated) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (["INVALID_TRANSITION", "INVALID_EDIT", "ORDER_LOCKED"].includes(error.code)) return Response.json({ error: error.message }, { status: 422 });
    console.error("PATCH /api/admin/orders", error);
    return Response.json({ error: "Failed to update order." }, { status: 500 });
  }
}
