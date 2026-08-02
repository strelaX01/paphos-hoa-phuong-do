import { PASSWORD_RESET_LIFETIME_MINUTES } from "@/lib/passwordResetToken";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("Admin recovery email is not configured.");
  return { apiKey, from };
}

export function isAdminRecoveryEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.AUTH_EMAIL_FROM?.trim() && process.env.APP_URL?.trim());
}

async function sendEmail({ to, subject, text, html }) {
  const { apiKey, from } = getEmailConfig();
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "hoa-phuong-do-admin/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.message || payload.name || payload.code || "Unknown provider error";
    throw new Error(`Email provider returned ${response.status}: ${String(detail).slice(0, 300)}`);
  }
}

export function sendAdminPasswordResetEmail({ to, name, resetUrl }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const safeGreeting = escapeHtml(greeting);
  const safeResetUrl = escapeHtml(resetUrl);
  return sendEmail({
    to,
    subject: "Reset your Hoa Phuong Do admin password",
    text: `${greeting}\n\nUse this secure link to reset your admin password:\n${resetUrl}\n\nThe link expires in ${PASSWORD_RESET_LIFETIME_MINUTES} minutes and can only be used once. If you did not request this, you can ignore this email.`,
    html: `<p>${safeGreeting}</p><p>Use the secure button below to reset your Hoa Phuong Do admin password.</p><p><a href="${safeResetUrl}" style="display:inline-block;background:#8B1E1E;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px;font-weight:700">Reset password</a></p><p>This link expires in ${PASSWORD_RESET_LIFETIME_MINUTES} minutes and can only be used once.</p><p>If you did not request this, you can ignore this email.</p>`,
  });
}

export function sendAdminPasswordChangedEmail({ to, name }) {
  const greeting = name ? `Hello ${name},` : "Hello,";
  const safeGreeting = escapeHtml(greeting);
  return sendEmail({
    to,
    subject: "Your Hoa Phuong Do admin password was changed",
    text: `${greeting}\n\nYour admin password was changed successfully. All existing admin sessions have been signed out. If you did not make this change, secure your email account and contact the site operator immediately.`,
    html: `<p>${safeGreeting}</p><p>Your admin password was changed successfully. All existing admin sessions have been signed out.</p><p><strong>If you did not make this change, secure your email account and contact the site operator immediately.</strong></p>`,
  });
}
