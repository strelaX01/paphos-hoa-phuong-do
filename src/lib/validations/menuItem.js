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
  const tagId = typeof input?.tagId === "string" ? input.tagId.trim() : "";

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
  if (Object.hasOwn(input || {}, "price")) {
    const raw = input.price;
    const parsed = typeof raw === "string" ? parseFloat(raw) : Number(raw);

    if (Number.isNaN(parsed) || parsed < 0) {
      errors.price = "Price must be a valid non-negative number.";
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
      ...(tagId !== undefined ? { tagId: tagId || null } : {}),
      ...(deliverable !== undefined ? { deliverable } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(sortOrder !== undefined ? { sortOrder } : {}),
    },
  };
}
