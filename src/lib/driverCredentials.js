import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const SCRYPT_VERSION = "v2";
const TEMPORARY_PASSWORD_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function generateTemporaryPassword() {
  let token = "";
  for (let index = 0; index < 8; index += 1) token += alphabet[randomInt(0, alphabet.length)];
  return `HPD-${token.slice(0, 4)}-${token.slice(4)}`;
}

export function getTemporaryPasswordExpiry() {
  return new Date(Date.now() + TEMPORARY_PASSWORD_LIFETIME_MS);
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_VERSION}$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt}$${Buffer.from(derivedKey).toString("hex")}`;
}

export async function verifyPassword(password, passwordHash) {
  const parts = String(passwordHash || "").split("$");
  const isLegacy = parts.length === 3 && parts[0] === "scrypt";
  const isCurrent = parts.length === 7
    && parts[0] === "scrypt"
    && parts[1] === SCRYPT_VERSION
    && Number(parts[2]) === SCRYPT_OPTIONS.N
    && Number(parts[3]) === SCRYPT_OPTIONS.r
    && Number(parts[4]) === SCRYPT_OPTIONS.p;
  if (!isLegacy && !isCurrent) return false;

  const salt = isLegacy ? parts[1] : parts[5];
  const storedKeyHex = isLegacy ? parts[2] : parts[6];

  try {
    const storedKey = Buffer.from(storedKeyHex, "hex");
    if (storedKey.length !== 64 || storedKey.toString("hex") !== storedKeyHex.toLowerCase()) return false;

    const derivedKey = Buffer.from(isLegacy
      ? await scrypt(password, salt, storedKey.length)
      : await scrypt(password, salt, storedKey.length, SCRYPT_OPTIONS));
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

export function passwordNeedsRehash(passwordHash) {
  return !String(passwordHash || "").startsWith(`scrypt$${SCRYPT_VERSION}$`);
}
