/**
 * Single source of truth for the JWT signing secret.
 *
 * In production a missing JWT_SECRET is a fatal misconfiguration —
 * falling back to a publicly known string would let anyone forge
 * session tokens.
 */

const secret = process.env.JWT_SECRET;

if (!secret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable must be set in production. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  console.warn(
    "[auth] JWT_SECRET is not set - using an insecure development-only secret. " +
      "Set JWT_SECRET in .env.local."
  );
}

export const JWT_SECRET = new TextEncoder().encode(
  secret || "fushuma-dev-only-secret-do-not-use-in-production"
);
