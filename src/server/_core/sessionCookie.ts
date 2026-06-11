/**
 * Server-side session cookie management.
 *
 * The session JWT is set as an HttpOnly cookie so it is never readable
 * from client-side JavaScript (XSS cannot exfiltrate it). SameSite=Lax
 * means browsers do not attach it to cross-site POST requests, which
 * covers tRPC mutations against CSRF.
 */

export const SESSION_COOKIE_NAME = "fushuma_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function baseAttributes(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function buildSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_MAX_AGE_SECONDS}; ${baseAttributes()}`;
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; ${baseAttributes()}`;
}
