import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { db } from '@/utils/db/db';
import { bookingsTable } from '@/utils/db/schema';
import { recordStripeEventAndIsDuplicate } from '@/lib/webhooks';
import { eq } from 'drizzle-orm';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const stripe_event_id = event.id;
  const dataObject = event.data?.object as
    | Stripe.PaymentIntent
    | Stripe.Charge
    | Stripe.Checkout.Session
    | undefined;

  let booking_id: string | undefined;
  let paymentIntentId: string | undefined;
  let currency: string | undefined;
  let lastPaymentError: string | null = null;

  if (!dataObject) {
    return NextResponse.json({ success: true, info: 'No object on event' });
  }

  if ((dataObject as Stripe.Checkout.Session).object === 'checkout.session') {
    const session = dataObject as Stripe.Checkout.Session;
    booking_id = session.metadata?.booking_id;
    if (session.payment_intent) {
      if (typeof session.payment_intent === 'string') {
        paymentIntentId = session.payment_intent;
      } else {
        paymentIntentId = session.payment_intent.id;
        currency = session.payment_intent.currency ?? undefined;
      }
    }
  } else if ((dataObject as Stripe.PaymentIntent).object === 'payment_intent') {
    const pi = dataObject as Stripe.PaymentIntent;
    booking_id = pi.metadata?.booking_id;
    paymentIntentId = pi.id;
    currency = pi.currency ?? undefined;
    lastPaymentError = pi.last_payment_error?.message ?? null;
  } else if ((dataObject as Stripe.Charge).object === 'charge') {
    const charge = dataObject as Stripe.Charge;
    booking_id = charge.metadata?.booking_id;
    if (charge.payment_intent) {
      paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id;
    }
    currency = charge.currency ?? undefined;
  }

  if (!booking_id) {
    return NextResponse.json({ success: true, info: 'No booking_id metadata' });
  }

  const isDuplicate = await recordStripeEventAndIsDuplicate({
    stripe_event_id,
    booking_id,
    status: event.type,
    payload: event,
  });

  if (isDuplicate) {
    return NextResponse.json({ success: true, info: 'Duplicate event' });
  }

  const paymentStatusUpdate = (() => {
    switch (event.type) {
      case 'checkout.session.completed':
        return {
          paymentStatus: 'authorization_pending',
          lastPaymentError: null,
        };
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        return {
          paymentStatus: 'requires_payment',
          lastPaymentError: 'checkout_session_failed',
        };
      case 'payment_intent.amount_capturable_updated':
        return { paymentStatus: 'capturable', lastPaymentError: null };
      case 'payment_intent.canceled':
        return {
          paymentStatus: 'canceled',
          lastPaymentError,
        };
      case 'payment_intent.payment_failed':
        return {
          paymentStatus: 'requires_payment',
          lastPaymentError,
        };
      case 'charge.captured':
      case 'payment_intent.succeeded':
        return { paymentStatus: 'captured', lastPaymentError: null };
      case 'charge.refunded':
        return { paymentStatus: 'refunded', lastPaymentError: null };
      default:
        return null;
    }
  })();

  if (!paymentStatusUpdate) {
    return NextResponse.json({ success: true, info: 'Event ignored' });
  }

  const updateData: Partial<typeof bookingsTable.$inferInsert> = {
    paymentStatus: paymentStatusUpdate.paymentStatus,
    lastPaymentError: paymentStatusUpdate.lastPaymentError,
    lastPaymentEventAt: new Date(),
    updatedAt: new Date(),
  };

  if (paymentIntentId) {
    updateData.paymentIntentId = paymentIntentId;
  }

  if (currency) {
    updateData.paymentCurrency = currency;
  }

  await db
    .update(bookingsTable)
    .set(updateData)
    .where(eq(bookingsTable.id, booking_id));

  return NextResponse.json({ success: true });
}
