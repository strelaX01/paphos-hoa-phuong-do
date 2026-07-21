export function slugifyCategory(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function validateMenuCategoryInput(input, { partial = false } = {}) {
  const errors = {};
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const slugInput = typeof input?.slug === "string" ? input.slug.trim() : "";
  const isActiveInput = input?.isActive;

  if (!partial || Object.hasOwn(input || {}, "title")) {
    if (!title) {
      errors.title = "Category title is required.";
    } else if (title.length > 80) {
      errors.title = "Category title must be 80 characters or fewer.";
    }
  }

  const slug = slugifyCategory(slugInput || title);

  if (!partial || slugInput || title) {
    if (!slug) {
      errors.slug = "Category slug is required.";
    } else if (slug.length > 90) {
      errors.slug = "Category slug must be 90 characters or fewer.";
    }
  }

  let isActive;
  if (isActiveInput === undefined || isActiveInput === null) {
    isActive = undefined;
  } else if (typeof isActiveInput === "boolean") {
    isActive = isActiveInput;
  } else {
    errors.isActive = "Active status must be true or false.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    data: {
      ...(title ? { title } : {}),
      ...(slug ? { slug } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  };
}
