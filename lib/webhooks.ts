import { db } from '@/utils/db/db';
import { bookingPaymentsTable } from '@/utils/db/schema';
import { eq } from 'drizzle-orm';

type StripeEventRecordArgs = {
  stripe_event_id: string;
  booking_id: string;
  status: string;
  payload: unknown;
};

export async function recordStripeEventAndIsDuplicate({
  stripe_event_id,
  booking_id,
  status,
  payload,
}: StripeEventRecordArgs) {
  try {
    await db.insert(bookingPaymentsTable).values({
      bookingId: booking_id,
      stripeEventId: stripe_event_id,
      status,
      payload,
    });
    return false;
  } catch (error: any) {
    const message = String(error?.message ?? '');
    if (message.includes('booking_payments_stripe_event_id_idx')) {
      return true;
    }
    throw error;
  }
}
