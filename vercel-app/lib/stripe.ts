import Stripe from 'stripe';

// Server-side Stripe client. Requires STRIPE_SECRET_KEY.
// Do NOT expose the secret key to the client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' } as any);

export const getSiteUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (!fromEnv) return 'http://localhost:3000';
  if (fromEnv.startsWith('http')) return fromEnv;
  return `https://${fromEnv}`;
};


