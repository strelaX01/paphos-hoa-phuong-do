export function validateMenuTagInput(input, { partial = false } = {}) {
  const errors = {};
  const label = typeof input?.label === "string" ? input.label.trim() : "";
  const description = typeof input?.description === "string" ? input.description.trim() : "";

  if (!partial || Object.hasOwn(input || {}, "label")) {
    if (!label) {
      errors.label = "Tag label is required.";
    } else if (label.length > 48) {
      errors.label = "Tag label must be 48 characters or fewer.";
    }
  }

  if (description && description.length > 160) {
    errors.description = "Tag description must be 160 characters or fewer.";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    data: {
      ...(label ? { label } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
    },
  };
}
