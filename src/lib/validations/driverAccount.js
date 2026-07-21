const usernamePattern = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/;

export function validateDriverAccountInput(input) {
  const errors = {};
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const username = typeof input?.username === "string" ? input.username.trim().toLowerCase() : "";
  const phone = typeof input?.phone === "string" ? input.phone.trim() : "";
  const status = typeof input?.status === "string" ? input.status.trim().toUpperCase() : "ACTIVE";

  if (!name) errors.name = "Driver name is required.";
  else if (name.length > 100) errors.name = "Driver name must be 100 characters or fewer.";

  if (!username) errors.username = "Username is required.";
  else if (!usernamePattern.test(username)) errors.username = "Use 3-32 lowercase letters, numbers, dots, dashes, or underscores.";

  if (phone.length > 30) errors.phone = "Phone number must be 30 characters or fewer.";
  if (!["ACTIVE", "INACTIVE"].includes(status)) errors.status = "Status is invalid.";

  return {
    data: { name, username, phone: phone || null, status },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
