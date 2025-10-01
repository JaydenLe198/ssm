'use server';

import { db } from '@/utils/db/db';
import { conversationsTable, messagesTable, userProfilesTable, bookingsTable } from '@/utils/db/schema';
import { createClient } from '@/utils/supabase/server';
import { eq, or, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

export async function createBookingRequest(
  conversationId: string,
  customerId: string,
  tutorId: string,
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

  if (!user || (user.id !== customerId && user.id !== tutorId)) {
    return { error: 'Unauthorized to create booking request.' };
  }

  try {
    const [newBooking] = await db
      .insert(bookingsTable)
      .values({
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
        status: 'pending',
      })
      .returning({ id: bookingsTable.id });

    if (newBooking) {
      revalidatePath(`/chat/${conversationId}`);
      return { success: true, bookingId: newBooking.id };
    } else {
      return { success: false, error: 'Failed to create booking request.' };
    }
  } catch (error) {
    console.error('Error creating booking request:', error);
    return { success: false, error: 'Failed to create booking request.' };
  }
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
    const [updatedBooking] = await db
      .update(bookingsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookingsTable.id, bookingId))
      .returning({ id: bookingsTable.id });

    if (updatedBooking) {
      revalidatePath(`/chat/${updatedBooking.id}`); // Revalidate the chat page or booking page
      return { success: true };
    } else {
      return { success: false, error: 'Booking not found or unauthorized.' };
    }
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
        status: 'modified', // Set status to modified
        updatedAt: new Date(),
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning({ id: bookingsTable.id });

    if (updatedBooking) {
      revalidatePath(`/chat/${conversationId}`);
      return { success: true, bookingId: updatedBooking.id };
    } else {
      return { success: false, error: 'Failed to modify booking request.' };
    }
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
