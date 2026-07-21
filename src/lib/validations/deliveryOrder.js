import { DELIVERY_CONFIG } from "@/lib/deliveryConfig";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]+$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateDeliveryOrderInput(input) {
  const errors = {};
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input?.phone === "string" ? input.phone.trim() : "";
  const street = typeof input?.street === "string" ? input.street.trim() : "";
  const area = typeof input?.area === "string" ? input.area.trim() : "";
  const notes = typeof input?.notes === "string" ? input.notes.trim() : "";
  const website = typeof input?.website === "string" ? input.website.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");
  const normalizedPhone = phone.startsWith("+") ? `+${phoneDigits}` : phoneDigits;

  if (name.length < 2 || name.length > 100) errors.name = "Name must be between 2 and 100 characters.";
  if (email && (!emailPattern.test(email) || email.length > 254)) errors.email = "Enter a valid email address.";
  if (!phonePattern.test(phone) || phone.length > 30 || phoneDigits.length < 6 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number using 6 to 15 digits.";
  if (street.length < 5 || street.length > 200) errors.street = "Delivery address must be between 5 and 200 characters.";
  if (area.length < 2 || area.length > 100) errors.area = "Area must be between 2 and 100 characters.";
  if (notes.length > 1000) errors.notes = "Delivery notes must be 1000 characters or fewer.";

  const rawItems = Array.isArray(input?.items) ? input.items : [];
  if (!rawItems.length) errors.items = "Your cart is empty.";
  if (rawItems.length > DELIVERY_CONFIG.maxDistinctItems) errors.items = `An order can contain at most ${DELIVERY_CONFIG.maxDistinctItems} different dishes.`;

  const seen = new Set();
  const items = [];
  let totalQuantity = 0;
  rawItems.forEach((item, index) => {
    const slug = typeof item?.slug === "string" ? item.slug.trim().toLowerCase() : "";
    const quantity = Number(item?.quantity);
    const note = typeof item?.note === "string" ? item.note.trim() : "";
    if (!slugPattern.test(slug) || slug.length > 120) errors[`items.${index}.slug`] = "One or more cart items are invalid.";
    if (seen.has(slug)) errors.items = "Duplicate cart items are not allowed.";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > DELIVERY_CONFIG.maxItemQuantity) errors[`items.${index}.quantity`] = `Quantity must be between 1 and ${DELIVERY_CONFIG.maxItemQuantity}.`;
    if (note.length > 300) errors[`items.${index}.note`] = "Item notes must be 300 characters or fewer.";
    seen.add(slug);
    totalQuantity += Number.isInteger(quantity) ? quantity : 0;
    items.push({ slug, quantity, note: note || null });
  });
  if (totalQuantity > DELIVERY_CONFIG.maxTotalQuantity) errors.items = `An order can contain at most ${DELIVERY_CONFIG.maxTotalQuantity} items.`;

  return {
    data: { name, email: email || null, phone: normalizedPhone, street, area, notes: notes || null, website, items },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
