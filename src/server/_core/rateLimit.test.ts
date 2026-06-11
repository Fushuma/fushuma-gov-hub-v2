import { describe, it, expect } from 'vitest';
import { assertRateLimit } from './rateLimit';
import { kv } from './kv';
import {
  buildSessionCookie,
  buildClearSessionCookie,
  SESSION_COOKIE_NAME,
} from './sessionCookie';

describe('kv (memory store)', () => {
  it('stores and retrieves values', async () => {
    await kv.set('test:key', 'value', 60_000);
    expect(await kv.get('test:key')).toBe('value');
  });

  it('expires values after the TTL', async () => {
    await kv.set('test:expiring', 'value', 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(await kv.get('test:expiring')).toBeNull();
  });

  it('deletes values', async () => {
    await kv.set('test:deleted', 'value', 60_000);
    await kv.del('test:deleted');
    expect(await kv.get('test:deleted')).toBeNull();
  });

  it('increments counters within a window', async () => {
    expect(await kv.incr('test:counter', 60_000)).toBe(1);
    expect(await kv.incr('test:counter', 60_000)).toBe(2);
    expect(await kv.incr('test:counter', 60_000)).toBe(3);
  });
});

describe('assertRateLimit', () => {
  it('allows requests under the limit', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(
        assertRateLimit({ bucket: 'test.under', key: 'a', limit: 3, windowMs: 60_000 })
      ).resolves.toBeUndefined();
    }
  });

  it('rejects requests over the limit', async () => {
    for (let i = 0; i < 2; i++) {
      await assertRateLimit({ bucket: 'test.over', key: 'b', limit: 2, windowMs: 60_000 });
    }
    await expect(
      assertRateLimit({ bucket: 'test.over', key: 'b', limit: 2, windowMs: 60_000 })
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  it('tracks separate keys independently', async () => {
    await assertRateLimit({ bucket: 'test.keys', key: 'user1', limit: 1, windowMs: 60_000 });
    await expect(
      assertRateLimit({ bucket: 'test.keys', key: 'user2', limit: 1, windowMs: 60_000 })
    ).resolves.toBeUndefined();
  });
});

describe('session cookie', () => {
  it('sets an HttpOnly, SameSite=Lax cookie', () => {
    const cookie = buildSessionCookie('token123');
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=token123`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d+/);
  });

  it('clears the cookie with Max-Age=0', () => {
    const cookie = buildClearSessionCookie();
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(cookie).toContain('Max-Age=0');
    expect(cookie).toContain('HttpOnly');
  });
});
