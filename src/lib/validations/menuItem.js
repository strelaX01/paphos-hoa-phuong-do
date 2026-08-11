export function slugifyItem(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function validateMenuItemInput(input, { partial = false } = {}) {
  const errors = {};

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const nameEn = typeof input?.nameEn === "string" ? input.nameEn.trim() : "";
  const slugInput = typeof input?.slug === "string" ? input.slug.trim() : "";
  const description = typeof input?.description === "string" ? input.description.trim() : "";
  const image = typeof input?.image === "string" ? input.image.trim() : "";
  const categoryId = typeof input?.categoryId === "string" ? input.categoryId.trim() : "";
  const rawVariants = Array.isArray(input?.variants) ? input.variants : [];
  const hasPricingInput = Object.hasOwn(input || {}, "pricingMode") || Object.hasOwn(input || {}, "variants");
  const pricingMode = partial && !hasPricingInput ? undefined : input?.pricingMode === "variants" ? "variants" : "single";

  // --- name ---
  if (!partial || Object.hasOwn(input || {}, "name")) {
    if (!name) {
      errors.name = "Item name is required.";
    } else if (name.length > 120) {
      errors.name = "Item name must be 120 characters or fewer.";
    }
  }

  // --- slug ---
  const slug = slugifyItem(slugInput || nameEn || name);

  if (!partial || slugInput || nameEn || name) {
    if (!slug) {
      errors.slug = "Item slug is required.";
    } else if (slug.length > 140) {
      errors.slug = "Item slug must be 140 characters or fewer.";
    }
  }

  // --- nameEn ---
  if (nameEn && nameEn.length > 120) {
    errors.nameEn = "English name must be 120 characters or fewer.";
  }

  // --- description ---
  if (description && description.length > 500) {
    errors.description = "Description must be 500 characters or fewer.";
  }

  // --- image ---
  if (image && image.length > 500) {
    errors.image = "Image URL must be 500 characters or fewer.";
  }

  // --- price ---
  let price;
  const variants = [];
  if (pricingMode === "variants") {
    if (rawVariants.length < 2 || rawVariants.length > 10) {
      errors.variants = "Add between 2 and 10 price options.";
    }
    const labels = new Set();
    rawVariants.slice(0, 10).forEach((variant, index) => {
      const label = typeof variant?.label === "string" ? variant.label.trim() : "";
      const parsedPrice = typeof variant?.price === "string" ? Number(variant.price.trim()) : Number(variant?.price);
      const normalizedLabel = label.toLowerCase();
      if (!label || label.length > 60) errors[`variants.${index}.label`] = "Each price option needs a label of 60 characters or fewer.";
      if (labels.has(normalizedLabel)) errors[`variants.${index}.label`] = "Price option labels must be unique.";
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0 || parsedPrice > 10000) errors[`variants.${index}.price`] = "Each option price must be between 0.01 and 10,000.";
      if (label) labels.add(normalizedLabel);
      if (label && Number.isFinite(parsedPrice) && parsedPrice > 0 && parsedPrice <= 10000) {
        variants.push({ label, price: parsedPrice, sortOrder: index, isActive: variant?.isActive !== false });
      }
    });
    if (variants.length) price = Math.min(...variants.map((variant) => variant.price));
  } else if (Object.hasOwn(input || {}, "price")) {
    const raw = input.price;
    const parsed = typeof raw === "string" ? parseFloat(raw) : Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10000) {
      errors.price = "Price must be between 0.01 and 10,000.";
    } else {
      price = parsed;
    }
  } else if (!partial) {
    errors.price = "Price is required.";
  }

  // --- categoryId ---
  if (!partial || Object.hasOwn(input || {}, "categoryId")) {
    if (!categoryId && !partial) {
      errors.categoryId = "Category is required.";
    }
  }

  // --- booleans ---
  function parseBool(key) {
    const value = input?.[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value === "boolean") return value;
    errors[key] = `${key} must be true or false.`;
    return undefined;
  }

  const deliverable = parseBool("deliverable");
  const isFeatured = parseBool("isFeatured");
  const isSpicy = parseBool("isSpicy");
  const isActive = parseBool("isActive");

  // --- sortOrder ---
  let sortOrder;
  if (Object.hasOwn(input || {}, "sortOrder")) {
    const raw = input.sortOrder;
    const parsed = typeof raw === "string" ? parseInt(raw, 10) : Number(raw);

    if (!Number.isInteger(parsed)) {
      errors.sortOrder = "Sort order must be an integer.";
    } else {
      sortOrder = parsed;
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    data: {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(nameEn !== undefined ? { nameEn: nameEn || null } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(image !== undefined ? { image: image || null } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(deliverable !== undefined ? { deliverable } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isSpicy !== undefined ? { isSpicy } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
      ...(pricingMode ? { pricingMode, variants } : {}),
    },
  };
}
