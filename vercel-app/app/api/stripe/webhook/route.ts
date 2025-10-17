import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } } as any;

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'No webhook secret' }, { status: 500 });

  let body: Buffer;
  try {
    const arr = await req.arrayBuffer();
    body = Buffer.from(arr);
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // TODO: map Stripe customer/subscription to Supabase user and upsert status
  // Map: client_reference_id/metadata.user_id -> subscriptions + users.plan_tier
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
  const admin = (supabaseUrl && serviceRole) ? createClient(supabaseUrl, serviceRole) : null;

  async function upsertSubscription(payload: any) {
    if (!admin) return;
    const obj = payload?.data?.object || payload;
    const userId = obj?.client_reference_id || obj?.metadata?.user_id || obj?.metadata?.userId;
    const customerId = obj?.customer || obj?.customer_id;
    const subscription = obj?.subscription || (obj?.object === 'subscription' ? obj?.id : null);
    const priceId = obj?.items?.data?.[0]?.price?.id || obj?.plan?.id || obj?.price?.id;
    const status = obj?.status || (obj?.object === 'checkout.session' ? 'active' : undefined);

    if (!userId) return;
    await admin.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription,
      stripe_price_id: priceId,
      status,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (status === 'active' || status === 'trialing') {
      await admin.from('users').update({ plan_tier: 'pro' }).eq('id', userId);
    }
    if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired' || status === 'past_due') {
      await admin.from('users').update({ plan_tier: 'free' }).eq('id', userId);
    }
  }
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await upsertSubscription(event);
        break;
      case 'customer.subscription.created':
        await upsertSubscription(event);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await upsertSubscription(event);
        break;
      default:
        break;
    }
  } catch (e) {
    // swallow
  }

  return NextResponse.json({ received: true });
}


