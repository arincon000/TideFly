import { NextRequest, NextResponse } from 'next/server';
import { stripe, getSiteUrl } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { customerId } = body || {};
    if (!customerId) return NextResponse.json({ error: 'Missing customerId' }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getSiteUrl()}/alerts`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Portal error' }, { status: 500 });
  }
}


