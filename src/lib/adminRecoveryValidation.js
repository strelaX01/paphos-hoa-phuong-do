export const RECOVERY_EMAIL_MAX_LENGTH = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRecoveryEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getRecoveryEmailError(value) {
  const email = normalizeRecoveryEmail(value);
  if (!email) return "Admin email is required.";
  if (email.length > RECOVERY_EMAIL_MAX_LENGTH) {
    return `Email must not exceed ${RECOVERY_EMAIL_MAX_LENGTH} characters.`;
  }
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  return null;
}
