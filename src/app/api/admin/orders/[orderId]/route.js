import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { DELIVERY_CONFIG } from "@/lib/deliveryConfig";
import { orderAdminSelect, orderDriverSelect, serializeAdminOrder, serializeDriverOrder } from "@/lib/orderAdminData";
import { ADMIN_NEXT_STATUS, DRIVER_NEXT_STATUS, ORDER_STATUSES } from "@/lib/orderStatus";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_TITLES = {
  PREPARING: "Kitchen started preparing",
  PENDING_PICKUP: "Ready for delivery",
  EN_ROUTE: "Delivery started",
  DELIVERED: "Order completed",
  CANCELLED: "Order cancelled",
};
const FULL_EDIT_STATUSES = ["PENDING"];
const DELIVERY_EDIT_STATUSES = ["PENDING", "PREPARING", "PENDING_PICKUP"];
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

export async function PATCH(request, context) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] });
  if (auth.response) return auth.response;
  const { orderId } = await context.params;
  const account = auth.account;
  const isDriver = account.role === "DRIVER";

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const nextStatus = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  const hasDriver = Object.prototype.hasOwnProperty.call(body || {}, "driverId");
  const hasDeliveryFee = Object.prototype.hasOwnProperty.call(body || {}, "deliveryFee");
  const hasEdit = Object.prototype.hasOwnProperty.call(body || {}, "edit");
  const deliveryFee = Number(body?.deliveryFee);
  const deliveryFeeCents = Math.round(deliveryFee * 100);
  if (nextStatus && !ORDER_STATUSES.includes(nextStatus)) return Response.json({ error: "Invalid order status." }, { status: 422 });
  if (hasDriver) return Response.json({ error: "Driver assignment is not supported." }, { status: 422 });
  if (hasDeliveryFee && (!Number.isFinite(deliveryFee) || deliveryFeeCents < 1 || deliveryFeeCents > 10000)) return Response.json({ error: "Invalid delivery fee." }, { status: 422 });
  if (!nextStatus && !hasDeliveryFee && !hasEdit) return Response.json({ error: "Provide a status, delivery fee, or order changes to update." }, { status: 422 });
  if (isDriver && (hasDeliveryFee || hasEdit || hasDriver || !nextStatus)) return Response.json({ error: "Drivers can only update delivery status." }, { status: 403 });
  if (isDriver && !Object.values(DRIVER_NEXT_STATUS).includes(nextStatus)) return Response.json({ error: "Drivers can only start or complete a delivery." }, { status: 403 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true, paymentMethod: true, customerName: true, customerPhone: true, customerEmail: true, deliveryStreet: true, deliveryZone: true, deliveryNotes: true, subtotal: true, discountTotal: true, deliveryFee: true, deliveryFeePolicyNearby: true, deliveryFeePolicyFarther: true, items: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, variantLabel: true, note: true, quantity: true, unitPrice: true } } },
      });
      if (!current) return null;
      const allowFullEdit = FULL_EDIT_STATUSES.includes(current.status);
      const allowDeliveryEdit = DELIVERY_EDIT_STATUSES.includes(current.status);
      const editValidation = hasEdit ? validateOrderEdit(body.edit, allowFullEdit) : null;
      if (hasEdit && !allowDeliveryEdit) throw Object.assign(new Error("This order can no longer be edited at its current status."), { code: "ORDER_LOCKED" });
      if (editValidation?.errors.length) throw Object.assign(new Error(editValidation.errors[0]), { code: "INVALID_EDIT" });
      const allowedDeliveryFees = [
        Math.round(Number(current.deliveryFeePolicyNearby ?? 3) * 100),
        Math.round(Number(current.deliveryFeePolicyFarther ?? 3.5) * 100),
      ];
      if (hasDeliveryFee && !allowedDeliveryFees.includes(deliveryFeeCents)) throw Object.assign(new Error("Delivery fee must match one of the values accepted for this order."), { code: "INVALID_EDIT" });
      if (hasDeliveryFee && ["EN_ROUTE", "DELIVERED", "CANCELLED"].includes(current.status)) throw Object.assign(new Error("Delivery fee cannot be changed after the order has been picked up, delivered, or cancelled."), { code: "ORDER_LOCKED" });
      const expectedNextStatus = (isDriver ? DRIVER_NEXT_STATUS : ADMIN_NEXT_STATUS)[current.status];
      const canCancel = !isDriver && nextStatus === "CANCELLED" && ["PENDING", "PREPARING", "PENDING_PICKUP"].includes(current.status);
      if (nextStatus && nextStatus !== current.status && nextStatus !== expectedNextStatus && !canCancel) throw Object.assign(new Error(`Cannot move an order from ${current.status} to ${nextStatus}.`), { code: "INVALID_TRANSITION" });
      const now = new Date();
      const statusChanged = Boolean(nextStatus && nextStatus !== current.status);
      const timestamps = statusChanged ? {
        ...(nextStatus === "PREPARING" ? { confirmedAt: now } : {}),
        ...(nextStatus === "EN_ROUTE" ? { pickedUpAt: now } : {}),
        ...(nextStatus === "DELIVERED" ? { deliveredAt: now, ...(current.paymentMethod === "CASH" ? { paymentStatus: "PAID" } : {}) } : {}),
        ...(nextStatus === "CANCELLED" ? { cancelledAt: now } : {}),
      } : {};
      const timelineCreates = [];
      if (statusChanged) timelineCreates.push({ status: nextStatus, title: STATUS_TITLES[nextStatus], note: isDriver ? `Updated by driver ${account.name}.` : null });
      if (hasDeliveryFee && deliveryFeeCents !== Math.round(Number(current.deliveryFee) * 100)) {
        timelineCreates.push({ title: "Delivery fee updated", note: `Changed from EUR ${Number(current.deliveryFee).toFixed(2)} to EUR ${(deliveryFeeCents / 100).toFixed(2)} by admin.` });
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
        where: { id: orderId },
        data: { ...(nextStatus ? { status: nextStatus } : {}), ...editData, ...pricing, ...timestamps, ...(timelineCreates.length ? { timeline: { create: timelineCreates } } : {}) },
        select: isDriver ? orderDriverSelect : orderAdminSelect,
      });
    });
    if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });
    return Response.json({ data: isDriver ? serializeDriverOrder(updated) : serializeAdminOrder(updated) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (["INVALID_TRANSITION", "INVALID_EDIT", "ORDER_LOCKED"].includes(error.code)) return Response.json({ error: error.message }, { status: 422 });
    console.error("PATCH /api/admin/orders/[orderId]", error);
    return Response.json({ error: "Failed to update order." }, { status: 500 });
  }
}
