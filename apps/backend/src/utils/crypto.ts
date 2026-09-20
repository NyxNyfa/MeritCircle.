import crypto from "crypto";

/**
 * Generate a cryptographically secure random hexadecimal nonce string.
 */
export function generateNonce(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a plain text token or OTP code with SHA-256 for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a 6-digit numeric OTP code.
 */
export function generateOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
