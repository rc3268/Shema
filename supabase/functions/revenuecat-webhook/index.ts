// Supabase Edge Function: receives RevenueCat's webhook and is the ONLY thing in this whole
// app that's ever allowed to write `profiles.owns_app` / `sync_subscription_active` (see the
// RLS policy on that table -- it's read-only for a signed-in user for exactly this reason: an
// updatable client-side policy would let anyone grant themselves the paid unlock for free).
//
// Deploy: supabase functions deploy revenuecat-webhook
// Configure, once deployed:
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<a random string you choose>
//   supabase secrets set REVENUECAT_SECRET_API_KEY=<RevenueCat dashboard -> API keys -> secret key>
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are already injected automatically into every
// Edge Function in the project -- nothing to set for those two.)
// Then in RevenueCat's dashboard (Project settings -> Integrations -> Webhooks): point it at
// this function's URL, and set the Authorization header value to the same string as
// REVENUECAT_WEBHOOK_AUTH above -- that header is this function's only auth check, so the two
// must match exactly.
//
// Design choice worth remembering: rather than hand-interpreting every RevenueCat event type
// (INITIAL_PURCHASE, RENEWAL, CANCELLATION, BILLING_ISSUE, PAUSE, ...) to guess whether an
// entitlement is currently active, this re-fetches the subscriber's canonical state from
// RevenueCat's own REST API on every event and writes THAT. Slightly more work per event, but
// it means this function can never drift out of sync with RevenueCat's own idea of "active" --
// grace periods, billing retries, and refunds are all already correctly reflected in that one
// value instead of being reverse-engineered here.
import { createClient } from 'npm:@supabase/supabase-js@2';

const RC_ENTITLEMENT_UNLOCK = 'owns_app';
const RC_ENTITLEMENT_SYNC = 'sync';

// RevenueCat's anonymous ids (used for a purchase made before ever signing into Shema -- the
// local-only unlock case) look like "$RCAnonymousID:<hex>". There's no Supabase account to
// attach that purchase to; it's tracked entirely on-device via the app's own RevenueCat SDK
// check instead (see index.html's getLocalEntitlement). Nothing to write here for those.
export function looksLikeSupabaseUserId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isEntitlementActive(subscriber: any, entitlementId: string): boolean {
  const ent = subscriber && subscriber.entitlements && subscriber.entitlements[entitlementId];
  if (!ent) return false;
  if (!ent.expires_date) return true; // non-expiring (e.g. the one-time unlock)
  return new Date(ent.expires_date).getTime() > Date.now();
}

// Exported (not just passed to Deno.serve below) so index.test.ts can call it directly against
// a mocked fetch/Supabase client without needing to actually bind a port.
export async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!expectedAuth || req.headers.get('Authorization') !== expectedAuth) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const event = payload && payload.event;
  const appUserId: string | undefined = event && event.app_user_id;
  if (!appUserId) return new Response('ok (no app_user_id)', { status: 200 });

  // Test events from RevenueCat's dashboard "Send test event" button use a fake id -- ack
  // without touching anything real.
  if (event.type === 'TEST') return new Response('ok (test event)', { status: 200 });

  if (!looksLikeSupabaseUserId(appUserId)) {
    console.log(`[revenuecat-webhook] anonymous/local purchase (${appUserId}), nothing to write`);
    return new Response('ok (anonymous, tracked on-device only)', { status: 200 });
  }

  const secretApiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
  if (!secretApiKey) {
    console.error('[revenuecat-webhook] REVENUECAT_SECRET_API_KEY is not set');
    return new Response('server not configured', { status: 500 });
  }

  let subscriber: any;
  try {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${secretApiKey}` },
    });
    if (!res.ok) {
      console.error('[revenuecat-webhook] subscriber lookup failed', res.status, await res.text());
      return new Response('upstream lookup failed', { status: 502 });
    }
    const body = await res.json();
    subscriber = body.subscriber;
  } catch (e) {
    console.error('[revenuecat-webhook] subscriber lookup threw', e);
    return new Response('upstream lookup failed', { status: 502 });
  }

  const ownsApp = isEntitlementActive(subscriber, RC_ENTITLEMENT_UNLOCK);
  const syncActive = isEntitlementActive(subscriber, RC_ENTITLEMENT_SYNC);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string, // bypasses RLS -- the one place that's supposed to
  );
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: appUserId, owns_app: ownsApp, sync_subscription_active: syncActive });

  if (error) {
    console.error('[revenuecat-webhook] profiles upsert failed', error);
    return new Response('database write failed', { status: 500 });
  }

  console.log(`[revenuecat-webhook] ${event.type} for ${appUserId}: owns_app=${ownsApp} sync=${syncActive}`);
  return new Response('ok', { status: 200 });
}

Deno.serve(handleWebhook);
