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

  // Map Stripe customer/subscription to Supabase user and upsert status
  // Uses client_reference_id/metadata.user_id to resolve the user
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
  const admin = (supabaseUrl && serviceRole) ? createClient(supabaseUrl, serviceRole) : null;

  async function upsertSubscription(payload: any) {
    if (!admin) return;
    const obj = payload?.data?.object || payload;

    const userId =
      obj?.client_reference_id || obj?.metadata?.user_id || obj?.metadata?.userId || null;

    const customerId = typeof obj?.customer === 'string' ? obj.customer : obj?.customer?.id;
    const sessionSubId = typeof obj?.subscription === 'string' ? obj.subscription : obj?.subscription?.id;

    let subId = sessionSubId;
    let subStatus: string | undefined = obj?.status;
    let priceId: string | undefined;
    let periodStart: string | undefined;
    let periodEnd: string | undefined;

    if (payload?.type === 'checkout.session.completed' && sessionSubId) {
      try {
        const sub = await stripe.subscriptions.retrieve(sessionSubId);
        subId = sub.id;
        subStatus = sub.status; // 'active' | 'trialing' | ...
        priceId = sub.items?.data?.[0]?.price?.id;
        if (sub.current_period_start) periodStart = new Date(sub.current_period_start * 1000).toISOString();
        if (sub.current_period_end) periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      } catch {}
    } else if (obj?.object === 'subscription') {
      subId = obj?.id;
      subStatus = obj?.status;
      priceId = obj?.items?.data?.[0]?.price?.id || obj?.plan?.id;
      if (obj?.current_period_start) periodStart = new Date(obj.current_period_start * 1000).toISOString();
      if (obj?.current_period_end) periodEnd = new Date(obj.current_period_end * 1000).toISOString();
    } else {
      priceId = obj?.items?.data?.[0]?.price?.id || obj?.plan?.id || obj?.price?.id;
    }

    if (!userId) return;
    await admin.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subId,
      stripe_price_id: priceId,
      status: subStatus,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (subStatus === 'active' || subStatus === 'trialing' || subStatus === 'complete') {
      await admin.from('users').update({ plan_tier: 'pro' }).eq('id', userId);
    }
    if (subStatus === 'canceled' || subStatus === 'unpaid' || subStatus === 'incomplete_expired' || subStatus === 'past_due') {
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


