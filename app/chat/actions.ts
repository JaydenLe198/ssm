'use server';

import { db } from '@/utils/db/db';
import { conversationsTable, messagesTable, userProfilesTable, bookingsTable } from '@/utils/db/schema';
import {
  capturePI,
  getStripeClient,
  createManualCaptureCheckoutSession,
} from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { eq, or, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const toSnakeCaseBooking = (booking: typeof bookingsTable.$inferSelect) => ({
  id: booking.id,
  conversation_id: booking.conversationId,
  customer_id: booking.customerId,
  tutor_id: booking.tutorId,
  title: booking.title,
  description: booking.description,
  scheduled_start: booking.scheduledStart,
  scheduled_end: booking.scheduledEnd,
  session_length_minutes: booking.sessionLengthMinutes,
  hourly_rate: booking.hourlyRate,
  total_amount: booking.totalAmount,
  status: booking.status,
  location: booking.location,
  meeting_link: booking.meetingLink,
  special_instructions: booking.specialInstructions,
  payment_intent_id: booking.paymentIntentId,
  payment_status: booking.paymentStatus,
  payment_amount_cents: booking.paymentAmountCents,
  payment_currency: booking.paymentCurrency,
  payment_version: booking.paymentVersion,
  last_payment_event_at: booking.lastPaymentEventAt,
  last_payment_error: booking.lastPaymentError,
  created_at: booking.createdAt,
  updated_at: booking.updatedAt,
});

const makePaymentIdemKey = (
  bookingId: string,
  action: 'create' | 'capture' | 'cancel' | 'refund',
  version: number
) => `booking:${bookingId}:${action}:v${version}`;

type BookingInsertInput = {
  conversationId: string;
  customerId: string;
  tutorId: string;
  title: string;
  description: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  sessionLengthMinutes: number;
  hourlyRate: string;
  totalAmount: string;
  location: string;
  meetingLink: string;
  specialInstructions: string;
  paymentIntentId?: string | null;
  paymentAmountCents?: number | null;
  paymentCurrency?: string;
  paymentStatus?: string;
  paymentVersion?: number;
};

function amountToCents(totalAmount: string): number | null {
  const totalAmountNumber = Number(totalAmount);
  if (!Number.isFinite(totalAmountNumber)) {
    return null;
  }
  const cents = Math.round(totalAmountNumber * 100);
  return cents > 0 ? cents : null;
}

async function insertPendingBooking(
  executor: typeof db,
  input: BookingInsertInput
) {
  const [inserted] = await executor
    .insert(bookingsTable)
    .values({
      conversationId: input.conversationId,
      customerId: input.customerId,
      tutorId: input.tutorId,
      title: input.title,
      description: input.description,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      sessionLengthMinutes: input.sessionLengthMinutes,
      hourlyRate: input.hourlyRate,
      totalAmount: input.totalAmount,
      location: input.location,
      meetingLink: input.meetingLink,
      specialInstructions: input.specialInstructions,
      status: 'pending',
      paymentIntentId: input.paymentIntentId ?? null,
      paymentAmountCents: input.paymentAmountCents ?? null,
      paymentCurrency: input.paymentCurrency ?? 'aud',
      paymentStatus: input.paymentStatus ?? 'requires_payment',
      paymentVersion: input.paymentVersion ?? 1,
    })
    .returning({ id: bookingsTable.id });

  return inserted ?? null;
}

export async function findOrCreateConversation(
  user1Id: string,
  user2Id: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to start a conversation.' };
  }

  // Ensure user1Id is always the current user for consistency
  const currentUserId = user.id;
  const otherUserId = user1Id === currentUserId ? user2Id : user1Id;

  // Try to find an existing conversation
  const existingConversation = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(
          eq(conversationsTable.user1Id, currentUserId),
          eq(conversationsTable.user2Id, otherUserId)
        ),
        and(
          eq(conversationsTable.user1Id, otherUserId),
          eq(conversationsTable.user2Id, currentUserId)
        )
      )
    )
    .limit(1);

  if (existingConversation.length > 0) {
    return { conversationId: existingConversation[0].id };
  }

  // If no conversation exists, create a new one
  try {
    const [newConversation] = await db
      .insert(conversationsTable)
      .values({
        user1Id: currentUserId,
        user2Id: otherUserId,
      })
      .returning({ id: conversationsTable.id });

    if (newConversation) {
      return { conversationId: newConversation.id };
    } else {
      return { error: 'Failed to create new conversation.' };
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { error: 'Failed to create new conversation.' };
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderId: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== senderId) {
    return { error: 'Unauthorized to send message.' };
  }

  try {
    await db.insert(messagesTable).values({
      conversationId,
      senderId,
      content,
    });
    // Removed revalidatePath to allow real-time subscription to handle updates
    return { success: true };
  } catch (error) {
    console.error('Error sending message:', error);
    return { error: 'Failed to send message.' };
  }
}

export async function getMessages(conversationId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to view messages.' };
  }

  // Verify that the current user is part of this conversation
  const conversation = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, conversationId),
        or(
          eq(conversationsTable.user1Id, user.id),
          eq(conversationsTable.user2Id, user.id)
        )
      )
    )
    .limit(1);

  if (conversation.length === 0) {
    return { error: 'Conversation not found or unauthorized.' };
  }

  const messages = await db
    .select({
      id: messagesTable.id,
      conversation_id: messagesTable.conversationId, // Use snake_case
      sender_id: messagesTable.senderId, // Use snake_case
      content: messagesTable.content,
      created_at: messagesTable.createdAt, // Use snake_case
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  return { messages };
}

export async function getConversations(userId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { error: 'Unauthorized to view conversations.' };
  }

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId)))
    .orderBy(desc(conversationsTable.updatedAt));

  return { conversations };
}

export async function getUserProfileById(userId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to view user profile.' };
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.id, userId));

  if (!profile) {
    return { error: 'User profile not found.' };
  }

  return { profile };
}

export type CreateBookingRequestSuccess = {
  success: true;
  bookingId: string;
  checkout_url: string;
  error?: undefined;
};

export type CreateBookingRequestFailure = {
  success: false;
  error: string;
  bookingId?: undefined;
  checkout_url?: undefined;
};

export type CreateBookingRequestResult =
  | CreateBookingRequestSuccess
  | CreateBookingRequestFailure;

export async function createBookingRequest(
  conversationId: string,
  customerId: string,
  tutorId: string,
  title: string,
  description: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  sessionLengthMinutes: number, // Keep for DB, but calculated
  hourlyRate: string,
  totalAmount: string, // Keep for DB, but calculated
  location: string,
  meetingLink: string,
  specialInstructions: string,
): Promise<CreateBookingRequestResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (user.id !== customerId && user.id !== tutorId)) {
    return { success: false, error: 'Unauthorized to create booking request.' };
  }

  try {
    const totalAmountCents = amountToCents(totalAmount);
    if (totalAmountCents === null) {
      return { success: false, error: 'Invalid total amount for booking.' };
    }

    const paymentCurrency = 'aud';

    const newBooking = await insertPendingBooking(db, {
      conversationId,
      customerId,
      tutorId,
      title,
      description,
      scheduledStart,
      scheduledEnd,
      sessionLengthMinutes,
      hourlyRate,
      totalAmount,
      location,
      meetingLink,
      specialInstructions,
      paymentAmountCents: totalAmountCents,
      paymentCurrency,
      paymentStatus: 'requires_payment',
      paymentVersion: 1,
    });

    if (!newBooking) {
      return { success: false, error: 'Failed to create booking request.' };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_WEBSITE_URL ??
      process.env.WEBSITE_URL ??
      'http://localhost:3000';

    const successUrl = `${baseUrl}/chat/${conversationId}?booking=${newBooking.id}&checkout=success`;
    const cancelUrl = `${baseUrl}/chat/${conversationId}?booking=${newBooking.id}&checkout=cancel`;

    const sessionResult = await createManualCaptureCheckoutSession({
      amount: totalAmountCents,
      currency: paymentCurrency,
      productName: title,
      successUrl,
      cancelUrl,
      metadata: {
        booking_id: newBooking.id,
        conversation_id: conversationId,
        customer_id: customerId,
        tutor_id: tutorId,
      },
    });

    if ('error' in sessionResult || !sessionResult.url) {
      const errorMessage =
        'error' in sessionResult
          ? sessionResult.error
          : 'Failed to start payment flow.';
      await db.delete(bookingsTable).where(eq(bookingsTable.id, newBooking.id));
      return { success: false, error: errorMessage };
    }

    revalidatePath(`/chat/${conversationId}`);
    return {
      success: true,
      bookingId: newBooking.id,
      checkout_url: sessionResult.url,
    };
  } catch (error) {
    console.error('Error creating booking request:', error);
    return { success: false, error: 'Failed to create booking request.' };
  }
}

export async function accept_booking(bookingId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'unauthorized' };
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));

  if (!booking) {
    return { success: false, error: 'booking_not_found' };
  }

  if (booking.tutorId !== user.id) {
    return { success: false, error: 'forbidden' };
  }

  if (!booking.paymentIntentId) {
    return { success: false, error: 'payment_intent_missing' };
  }

  const paymentStatus = booking.paymentStatus ?? 'requires_payment';
  const allowedStatuses: typeof paymentStatus[] = ['authorization_pending', 'capturable'];
  if (!allowedStatuses.includes(paymentStatus)) {
    return { success: false, error: 'payment_not_authorized_yet' };
  }

  const stripeResult = getStripeClient();
  if (!stripeResult.ok) {
    return { success: false, error: stripeResult.error.message };
  }

  let paymentIntent;
  try {
    paymentIntent = await stripeResult.client.paymentIntents.retrieve(
      booking.paymentIntentId
    );
  } catch (error) {
    console.error('Failed to retrieve payment intent before capture', error);
    return { success: false, error: 'payment_intent_missing' };
  }

  if (paymentIntent.status !== 'requires_capture') {
    return { success: false, error: 'payment_not_capturable' };
  }

  const captureResult = await capturePI({
    paymentIntentId: booking.paymentIntentId,
    idempotencyKey: makePaymentIdemKey(
      booking.id,
      'capture',
      booking.paymentVersion ?? 1
    ),
  });

  if ('error' in captureResult) {
    return { success: false, error: captureResult.error };
  }

  const [updated] = await db
    .update(bookingsTable)
    .set({
      status: 'accepted',
      paymentStatus: 'captured',
      lastPaymentError: null,
      lastPaymentEventAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookingsTable.id, bookingId))
    .returning();

  if (!updated) {
    return { success: false, error: 'accept_failed' };
  }

  revalidatePath(`/chat/${updated.conversationId}`);
  return { success: true, booking: toSnakeCaseBooking(updated) };
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'accepted' | 'declined' | 'modified'
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to update booking status.' };
  }

  try {
    if (status !== 'declined') {
      const [updatedBooking] = await db
        .update(bookingsTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(bookingsTable.id, bookingId))
        .returning({ id: bookingsTable.id });

      if (updatedBooking) {
        revalidatePath(`/chat/${updatedBooking.id}`);
        return { success: true };
      }

      return { success: false, error: 'Booking not found or unauthorized.' };
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));

    if (!booking) {
      return { success: false, error: 'Booking not found or unauthorized.' };
    }

    const paymentStatus = booking.paymentStatus ?? 'requires_payment';
    const now = new Date();
    let nextPaymentStatus = paymentStatus;

    if (booking.paymentIntentId) {
      const cancelableStatuses = [
        'authorization_pending',
        'authorized',
        'capturable',
      ];

      if (cancelableStatuses.includes(paymentStatus)) {
        const stripeResult = getStripeClient();
        if (!stripeResult.ok) {
          return { success: false, error: stripeResult.error.message };
        }

        try {
          await stripeResult.client.paymentIntents.cancel(booking.paymentIntentId);
          nextPaymentStatus = 'canceled';
        } catch (error) {
          console.error('Error canceling payment intent:', error);
          return { success: false, error: 'payment_cancel_failed' };
        }
      } else if (paymentStatus === 'captured') {
        const stripeResult = getStripeClient();
        if (!stripeResult.ok) {
          return { success: false, error: stripeResult.error.message };
        }

        try {
          await stripeResult.client.refunds.create({
            payment_intent: booking.paymentIntentId,
          });
          nextPaymentStatus = 'refunding';
        } catch (error) {
          console.error('Error creating refund for payment intent:', error);
          return { success: false, error: 'payment_refund_failed' };
        }
      }
    }

    const [updatedBooking] = await db
      .update(bookingsTable)
      .set({
        status: 'declined',
        paymentStatus: nextPaymentStatus,
        lastPaymentError: null,
        lastPaymentEventAt: now,
        updatedAt: now,
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning({ id: bookingsTable.id });

    if (!updatedBooking) {
      return { success: false, error: 'Booking not found or unauthorized.' };
    }

    revalidatePath(`/chat/${updatedBooking.id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return { success: false, error: 'Failed to update booking status.' };
  }
}

export async function getBookingById(bookingId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to view booking.' };
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));

  if (!booking) {
    return { error: 'Booking not found.' };
  }

  // Ensure the user is part of the conversation related to this booking
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, booking.conversationId))
    .limit(1);

  if (
    !conversation ||
    (conversation.user1Id !== user.id && conversation.user2Id !== user.id)
  ) {
    return { error: 'Unauthorized to view this booking.' };
  }

  return { booking };
}

export async function modifyBookingRequest(
  bookingId: string,
  conversationId: string,
  title: string,
  description: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  sessionLengthMinutes: number,
  hourlyRate: string,
  totalAmount: string,
  location: string,
  meetingLink: string,
  specialInstructions: string,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to modify booking request.' };
  }

  try {
    const [existingBooking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));

    if (!existingBooking) {
      return { error: 'Booking not found.' };
    }

    // Only the original sender or recipient can modify
    if (user.id !== existingBooking.customerId && user.id !== existingBooking.tutorId) {
      return { error: 'You are not authorized to modify this booking.' };
    }

    const totalAmountNumber = Number(totalAmount);
    if (!Number.isFinite(totalAmountNumber)) {
      return { success: false, error: 'Invalid total amount for booking.' };
    }

    const totalAmountCents = Math.round(totalAmountNumber * 100);
    if (totalAmountCents <= 0) {
      return { success: false, error: 'Invalid total amount for booking.' };
    }

    const paymentVersion = (existingBooking.paymentVersion ?? 0) + 1;

    const baseUrl =
      process.env.NEXT_PUBLIC_WEBSITE_URL ??
      process.env.WEBSITE_URL ??
      'http://localhost:3000';

    const successUrl = `${baseUrl}/chat/${conversationId}?booking=${bookingId}&checkout=success`;
    const cancelUrl = `${baseUrl}/chat/${conversationId}?booking=${bookingId}&checkout=cancel`;

    const checkoutSessionResult = await createManualCaptureCheckoutSession({
      amount: totalAmountCents,
      currency: 'aud',
      productName: title,
      successUrl,
      cancelUrl,
      metadata: {
        booking_id: bookingId,
        conversation_id: conversationId,
        version: paymentVersion.toString(),
      },
    });

    if ('error' in checkoutSessionResult || !checkoutSessionResult.url) {
      const errorMessage =
        'error' in checkoutSessionResult
          ? checkoutSessionResult.error
          : 'Failed to start payment flow.';
      return { success: false, error: errorMessage };
    }

    const checkoutSession = checkoutSessionResult;

    const [updatedBooking] = await db
      .update(bookingsTable)
      .set({
        title,
        description,
        scheduledStart,
        scheduledEnd,
        sessionLengthMinutes,
        hourlyRate,
        totalAmount,
        location,
        meetingLink,
        specialInstructions,
        status: 'modified',
        paymentIntentId: null,
        paymentAmountCents: totalAmountCents,
        paymentCurrency: existingBooking.paymentCurrency || 'aud',
        paymentStatus: 'requires_payment',
        paymentVersion,
        lastPaymentError: null,
        updatedAt: new Date(),
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning({ id: bookingsTable.id });

    if (!updatedBooking) {
      return { success: false, error: 'Failed to modify booking request.' };
    }

    revalidatePath(`/chat/${conversationId}`);
    if (!checkoutSession.url) {
      return { success: false, error: 'Failed to start payment flow.' };
    }

    return {
      success: true,
      bookingId: updatedBooking.id,
      checkout_url: checkoutSession.url,
    } as const;
  } catch (error) {
    console.error('Error modifying booking request:', error);
    return { success: false, error: 'Failed to modify booking request.' };
  }
}

export async function getBookingsByConversationId(conversationId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to view bookings.' };
  }

  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.conversationId, conversationId))
    .orderBy(desc(bookingsTable.createdAt));

  // Ensure the user is part of the conversation related to these bookings
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  if (
    !conversation ||
    (conversation.user1Id !== user.id && conversation.user2Id !== user.id)
  ) {
    return { error: 'Unauthorized to view these bookings.' };
  }

  return { bookings };
}

export async function getInitialChatData(conversationId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized to view chat data.' };
  }

  // Fetch conversation details
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  if (!conversation || (conversation.user1Id !== user.id && conversation.user2Id !== user.id)) {
    return { error: 'Conversation not found or unauthorized.' };
  }

  const otherUserId =
    conversation.user1Id === user.id
      ? conversation.user2Id
      : conversation.user1Id;

  // Fetch other user's profile
  const { profile: otherUserProfile, error: profileError } =
    await getUserProfileById(otherUserId);

  if (profileError) {
    console.error('Error fetching other user profile:', profileError);
    return { error: 'Failed to fetch other user profile.' };
  }

  // Fetch messages
  const { messages: fetchedMessages, error: messagesError } = await getMessages(
    conversationId
  );
  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    return { error: 'Failed to fetch messages.' };
  }

  // Fetch bookings
  const { bookings: fetchedBookings, error: bookingsError } =
    await getBookingsByConversationId(conversationId);
  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    return { error: 'Failed to fetch bookings.' };
  }

  return {
    currentUserId: user.id,
    otherUserId,
    otherUserProfile,
    messages: fetchedMessages,
    bookings: fetchedBookings,
  };
}
