// Run with: deno test --allow-net --allow-env --node-modules-dir=false supabase/functions/revenuecat-webhook/index.test.ts
// (--node-modules-dir=false is required because the repo's root package.json, added for
// Capacitor, otherwise makes Deno look for the npm: import below in a local node_modules --
// this function deploys through Supabase's own Deno runtime, which doesn't have that problem.)
// No real network, no real Supabase project needed -- globalThis.fetch is mocked below so this
// exercises the actual handler logic (auth check, anonymous-id skip, entitlement computation,
// the profiles write) against fake RevenueCat/Supabase responses.
import { assertEquals } from 'jsr:@std/assert';
import { handleWebhook, isEntitlementActive, looksLikeSupabaseUserId } from './index.ts';

const REAL_USER_ID = '11111111-2222-3333-4444-555555555555';
const ANON_ID = '$RCAnonymousID:abc123';

Deno.env.set('REVENUECAT_WEBHOOK_AUTH', 'test-secret');
Deno.env.set('REVENUECAT_SECRET_API_KEY', 'sk_fake');
Deno.env.set('SUPABASE_URL', 'https://fake.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fake-service-role-key');

function req(body: any, authHeader = 'test-secret'): Request {
  return new Request('https://fake-project.functions.supabase.co/revenuecat-webhook', {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockFetch(subscriberEntitlements: any, capturedUpserts: any[]) {
  return async (url: any, init: any) => {
    const u = String(url);
    if (u.includes('api.revenuecat.com')) {
      return new Response(JSON.stringify({ subscriber: { entitlements: subscriberEntitlements } }), { status: 200 });
    }
    if (u.includes('fake.supabase.co')) {
      capturedUpserts.push({ url: u, method: init.method, body: init.body ? JSON.parse(init.body) : null });
      return new Response('[]', { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error('unexpected fetch: ' + u);
  };
}

Deno.test('unit: looksLikeSupabaseUserId', () => {
  assertEquals(looksLikeSupabaseUserId(REAL_USER_ID), true);
  assertEquals(looksLikeSupabaseUserId(ANON_ID), false);
});

Deno.test('unit: isEntitlementActive', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  assertEquals(isEntitlementActive({ entitlements: { owns_app: { expires_date: null } } }, 'owns_app'), true);
  assertEquals(isEntitlementActive({ entitlements: { sync: { expires_date: future } } }, 'sync'), true);
  assertEquals(isEntitlementActive({ entitlements: { sync: { expires_date: past } } }, 'sync'), false);
  assertEquals(isEntitlementActive({ entitlements: {} }, 'sync'), false);
});

Deno.test('rejects a request with the wrong Authorization header', async () => {
  const res = await handleWebhook(req({ event: { type: 'INITIAL_PURCHASE', app_user_id: REAL_USER_ID } }, 'wrong-secret'));
  assertEquals(res.status, 401);
});

Deno.test('acks TEST events without doing anything', async () => {
  const res = await handleWebhook(req({ event: { type: 'TEST', app_user_id: 'whatever' } }));
  assertEquals(res.status, 200);
});

Deno.test('skips the Supabase write for an anonymous (local-only) purchase', async () => {
  const captured: any[] = [];
  globalThis.fetch = mockFetch({}, captured);
  const res = await handleWebhook(req({ event: { type: 'INITIAL_PURCHASE', app_user_id: ANON_ID } }));
  assertEquals(res.status, 200);
  assertEquals(captured.length, 0);
});

Deno.test('a real user unlocking the app writes owns_app=true, sync=false', async () => {
  const captured: any[] = [];
  globalThis.fetch = mockFetch({ owns_app: { expires_date: null } }, captured);
  const res = await handleWebhook(req({ event: { type: 'INITIAL_PURCHASE', app_user_id: REAL_USER_ID } }));
  assertEquals(res.status, 200);
  assertEquals(captured.length, 1);
  assertEquals(captured[0].body.owns_app, true);
  assertEquals(captured[0].body.sync_subscription_active, false);
  assertEquals(captured[0].body.id, REAL_USER_ID);
});

Deno.test('an expired sync subscription writes sync_subscription_active=false', async () => {
  const captured: any[] = [];
  const past = new Date(Date.now() - 86400000).toISOString();
  globalThis.fetch = mockFetch({ owns_app: { expires_date: null }, sync: { expires_date: past } }, captured);
  const res = await handleWebhook(req({ event: { type: 'EXPIRATION', app_user_id: REAL_USER_ID } }));
  assertEquals(res.status, 200);
  assertEquals(captured[0].body.owns_app, true);
  assertEquals(captured[0].body.sync_subscription_active, false);
});

Deno.test('an active sync subscription writes sync_subscription_active=true', async () => {
  const captured: any[] = [];
  const future = new Date(Date.now() + 86400000).toISOString();
  globalThis.fetch = mockFetch({ sync: { expires_date: future } }, captured);
  const res = await handleWebhook(req({ event: { type: 'RENEWAL', app_user_id: REAL_USER_ID } }));
  assertEquals(res.status, 200);
  assertEquals(captured[0].body.sync_subscription_active, true);
});

Deno.test('returns 502 if the RevenueCat subscriber lookup fails', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 500 });
  const res = await handleWebhook(req({ event: { type: 'RENEWAL', app_user_id: REAL_USER_ID } }));
  assertEquals(res.status, 502);
});

Deno.test('ignores non-POST requests', async () => {
  const res = await handleWebhook(new Request('https://fake/revenuecat-webhook', { method: 'GET' }));
  assertEquals(res.status, 405);
});
