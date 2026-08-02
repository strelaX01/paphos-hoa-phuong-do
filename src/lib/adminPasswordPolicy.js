export const ADMIN_PASSWORD_MAX_LENGTH = 128;

export function getAdminPasswordError(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    return "New password must contain between 10 and 128 characters.";
  }
  if (/\s/.test(password) || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "New password must include uppercase, lowercase, and number characters with no spaces.";
  }
  return null;
}
