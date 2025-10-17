import { NextRequest, NextResponse } from 'next/server';
import { stripe, getSiteUrl } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const priceId: string | undefined = body?.priceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
    const userId: string | undefined = body?.userId;
    const email: string | undefined = body?.email;
    const successUrl = `${getSiteUrl()}/alerts?upgrade=success`;
    const cancelUrl = `${getSiteUrl()}/#pricing`;

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    if (!priceId) {
      return NextResponse.json({ error: 'Missing priceId' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false },
      customer_email: email,
      client_reference_id: userId,
      metadata: userId ? { user_id: userId } : undefined,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Checkout error' }, { status: 500 });
  }
}


