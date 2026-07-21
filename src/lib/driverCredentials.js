import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword() {
  let token = "";
  for (let index = 0; index < 8; index += 1) token += alphabet[randomInt(0, alphabet.length)];
  return `HPD-${token.slice(0, 4)}-${token.slice(4)}`;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, storedKeyHex, ...extraParts] = String(passwordHash || "").split("$");

  if (algorithm !== "scrypt" || !salt || !storedKeyHex || extraParts.length > 0) return false;

  try {
    const storedKey = Buffer.from(storedKeyHex, "hex");
    if (storedKey.length !== 64 || storedKey.toString("hex") !== storedKeyHex.toLowerCase()) return false;

    const derivedKey = Buffer.from(await scrypt(password, salt, storedKey.length));
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}
