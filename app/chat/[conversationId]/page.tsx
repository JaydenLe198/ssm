'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import {
  getMessages,
  sendMessage,
  getUserProfileById,
  getBookingsByConversationId,
  updateBookingStatus,
  getInitialChatData, // Import the new server action
  accept_booking,
} from '@/app/chat/actions';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';
import { conversationsTable, SelectBooking, SelectUserProfile } from '@/utils/db/schema'; // Import SelectUserProfile
import { db } from '@/utils/db/db';
import { eq, or, and } from 'drizzle-orm';
import { CreateBookingForm } from '@/components/chat/CreateBookingForm';
import { ModifyBookingForm } from '@/components/chat/ModifyBookingForm';
import { Dialog, DialogContent, useDialog } from '@/components/ui/dialog';

const initialState = {
  success: false,
  error: undefined,
};

const sortBookingsByNewest = (items: SelectBooking[]) =>
  [...items].sort((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() -
    new Date(a.updatedAt ?? a.createdAt).getTime()
  );

const mapBookingFromRealtime = (payload: Record<string, any>): SelectBooking => ({
  id: payload.id,
  conversationId: payload.conversation_id,
  customerId: payload.customer_id,
  tutorId: payload.tutor_id,
  title: payload.title,
  description: payload.description,
  scheduledStart: payload.scheduled_start,
  scheduledEnd: payload.scheduled_end,
  sessionLengthMinutes: payload.session_length_minutes,
  hourlyRate: payload.hourly_rate,
  totalAmount: payload.total_amount,
  status: payload.status,
  location: payload.location,
  meetingLink: payload.meeting_link,
  specialInstructions: payload.special_instructions,
  paymentIntentId: payload.payment_intent_id,
  paymentStatus: payload.payment_status,
  paymentAmountCents: payload.payment_amount_cents,
  paymentCurrency: payload.payment_currency,
  paymentVersion: payload.payment_version,
  lastPaymentEventAt: payload.last_payment_event_at,
  lastPaymentError: payload.last_payment_error,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

function BookingDialogHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { titleId, descriptionId } = useDialog('BookingDialogHeader');

  return (
    <div className="space-y-1.5 text-center sm:text-left">
      <h2 id={titleId} className="text-lg font-semibold leading-none tracking-tight">
        {title}
      </h2>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function ChatPage({
  params,
}: {
  params: { conversationId: string };
}) {
  const { conversationId } = params;
  const [messages, setMessages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<SelectBooking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>('Loading...');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showModifyBookingForm, setShowModifyBookingForm] = useState<SelectBooking | null>(null);
  const [actionState, setActionState] = useState<'idle' | 'accepting' | 'declining'>('idle');
  const [optimisticPaymentStatus, setOptimisticPaymentStatus] = useState<
    'idle' | 'capturing' | 'canceling'
  >('idle');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkoutNotice, setCheckoutNotice] = useState<
    | { type: 'success' | 'warning'; message: string }
    | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Create a wrapper for sendMessage to fit useFormState signature
  const sendMessageWithConversationId = async (
    prevState: any,
    formData: FormData
  ) => {
    if (currentUserId) {
      return sendMessage(
        conversationId,
        formData.get('content') as string,
        currentUserId
      );
    }
    return { success: false, error: 'User not authenticated.' };
  };

  const [newMessageState, newMessageAction] = useFormState(
    sendMessageWithConversationId,
    initialState
  );

  useEffect(() => {
    console.log('chat realtime effect run', { conversationId });

    const fetchInitialMessages = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }
      // Use the new server action to fetch all initial data
      const {
        currentUserId: fetchedCurrentUserId,
        otherUserId: fetchedOtherUserId,
        otherUserProfile,
        messages: fetchedMessages,
        bookings: fetchedBookings,
        error: initialDataError,
      } = await getInitialChatData(conversationId);

      if (initialDataError) {
        console.error('Error fetching initial chat data:', initialDataError);
        router.push('/login'); // Redirect on critical error
        return;
      }

      setCurrentUserId(fetchedCurrentUserId || null);
      setOtherUserId(fetchedOtherUserId || null);
      if (otherUserProfile) {
        setOtherUserName(
          `${otherUserProfile.first_name} ${otherUserProfile.last_name}`
        );
      } else {
        setOtherUserName('Unknown User');
      }
      setMessages(fetchedMessages || []);
      setBookings(fetchedBookings || []);
    };

    fetchInitialMessages();

    // Set up real-time subscription
    const channel = supabase
      .channel(`chat_room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Map payload.new to snake_case properties for consistency
          const newMessage = {
            id: payload.new.id,
            conversation_id: payload.new.conversation_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            created_at: payload.new.created_at,
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'bookings',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('bookings realtime', payload);
          const eventType = payload.eventType;
          const newRow = payload.new as Record<string, any> | null;

          if (eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as Record<string, any>).id as string;
            setBookings((prevBookings) => prevBookings.filter((booking) => booking.id !== deletedId));
            return;
          }

          if (newRow == null) {
            return;
          }

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const nextBooking = mapBookingFromRealtime(newRow);
            setBookings((prevBookings) => {
              const others = prevBookings.filter((booking) => booking.id !== nextBooking.id);
              return sortBookingsByNewest([nextBooking, ...others]);
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('chat realtime channel status', status, conversationId);
      });

    return () => {
      console.log('chat realtime cleanup', { conversationId });
      supabase.removeChannel(channel);
    };
  }, [conversationId, router, supabase]);

  useEffect(() => {
    if (newMessageState.success) {
      // Clear the input field after successful message send
      (document.getElementById('message-input') as HTMLInputElement).value = '';
    } else if (newMessageState.error) {
      console.error('Error sending message:', newMessageState.error);
      alert(`Error: ${newMessageState.error}`);
    }
  }, [newMessageState]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const inlineFormsEnabled = false;

  useEffect(() => {
    const status = searchParams.get('checkout');
    if (!status) {
      return;
    }

    const notice =
      status === 'success'
        ? {
            type: 'success' as const,
            message:
              'Payment authorization submitted. We will update this booking once Stripe confirms.',
          }
        : {
            type: 'warning' as const,
            message: 'Checkout was cancelled. No payment authorization was created.',
          };

    setCheckoutNotice(notice);
    router.replace(`/chat/${conversationId}`, { scroll: false });
  }, [conversationId, router, searchParams]);

  const latestBooking = useMemo(() => {
    if (!bookings.length) {
      return null;
    }

    return bookings.reduce((latest, current) => {
      if (!latest) {
        return current;
      }

      const latestTimestamp = new Date(latest.updatedAt || latest.createdAt || latest.scheduledStart).getTime();
      const currentTimestamp = new Date(
        current.updatedAt || current.createdAt || current.scheduledStart
      ).getTime();

      return currentTimestamp >= latestTimestamp ? current : latest;
    }, bookings[0] as SelectBooking | null);
  }, [bookings]);

  useEffect(() => {
    if (!latestBooking) {
      setOptimisticPaymentStatus('idle');
      return;
    }

    const settledStatuses = ['captured', 'refunded', 'canceled', 'refunding'];
    if (settledStatuses.includes(latestBooking.paymentStatus ?? '')) {
      setOptimisticPaymentStatus('idle');
    }
  }, [latestBooking]);

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <CardTitle>Chat with {otherUserName}</CardTitle>
          {checkoutNotice && (
            <p
              className={
                checkoutNotice.type === 'success'
                  ? 'text-sm text-green-600'
                  : 'text-sm text-yellow-600'
              }
            >
              {checkoutNotice.message}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender_id === currentUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p>{message.content}</p>
                <span className="block text-xs mt-1 opacity-75">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t">
          {showBookingForm && inlineFormsEnabled ? (
            <CreateBookingForm
              conversationId={conversationId}
              customerId={currentUserId || ''}
              tutorId={otherUserId || ''}
              onBookingCreated={() => setShowBookingForm(false)}
              onCancel={() => setShowBookingForm(false)}
            />
          ) : showModifyBookingForm && inlineFormsEnabled ? (
            <ModifyBookingForm
              booking={showModifyBookingForm}
              conversationId={conversationId}
              onBookingModified={() => setShowModifyBookingForm(null)}
              onCancel={() => setShowModifyBookingForm(null)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {latestBooking ? (
                <Card key={latestBooking.id} className="border-l-4 border-yellow-500">
                  <CardHeader>
                    <CardTitle>Booking Request: {latestBooking.title}</CardTitle>
                    <p className="text-sm text-gray-500">Status: {latestBooking.status}</p>
                    <p className="text-sm text-gray-500">
                      Payment status: {latestBooking.paymentStatus ?? 'unknown'}
                    </p>
                    {optimisticPaymentStatus === 'capturing' && (
                      <p className="text-sm text-blue-600">Capturing payment…</p>
                    )}
                    {optimisticPaymentStatus === 'canceling' && (
                      <p className="text-sm text-blue-600">Canceling / refunding payment…</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>Description: {latestBooking.description}</p>
                    <p>
                      Scheduled:{' '}
                      {new Date(latestBooking.scheduledStart).toLocaleString()} -{' '}
                      {new Date(latestBooking.scheduledEnd).toLocaleString()}
                    </p>
                    <p>Hourly Rate: {latestBooking.hourlyRate}</p>
                    <p>Total Amount: {latestBooking.totalAmount}</p>
                    {latestBooking.status === 'pending' &&
                      currentUserId !== latestBooking.customerId && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={async () => {
                              setActionState('accepting');
                              setOptimisticPaymentStatus('capturing');
                              const result = await accept_booking(latestBooking.id);
                              if (!result.success) {
                                alert(`Error: ${result.error ?? 'Failed to accept booking.'}`);
                                setOptimisticPaymentStatus('idle');
                              }
                              setActionState('idle');
                            }}
                            disabled={actionState !== 'idle'}
                          >
                            {actionState === 'accepting' ? 'Accepting…' : 'Accept'}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () => {
                              setActionState('declining');
                              setOptimisticPaymentStatus('canceling');
                              const result = await updateBookingStatus(latestBooking.id, 'declined');
                              if (!result.success) {
                                alert(`Error: ${result.error ?? 'Failed to decline booking.'}`);
                                setOptimisticPaymentStatus('idle');
                              }
                              setActionState('idle');
                            }}
                            disabled={actionState !== 'idle'}
                          >
                            {actionState === 'declining' ? 'Declining…' : 'Decline'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowModifyBookingForm(latestBooking)}
                            disabled={actionState !== 'idle'}
                          >
                            Modify
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">No bookings yet. Create one below.</p>
              )}
              <form action={newMessageAction} className="flex gap-2">
                <Input
                  id="message-input"
                  name="content"
                  placeholder="Type your message..."
                  className="flex-grow"
                  required
                />
                <Button type="submit">Send</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookingForm(true)}
                  disabled={!currentUserId || !otherUserId}
                >
                  Create Booking
                </Button>
              </form>
              <Link
                href="/bookings"
                className="text-sm text-blue-600 hover:text-blue-500 underline underline-offset-4"
              >
                View all bookings
              </Link>
            </div>
          )}
        </div>
      </Card>
      <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
        <DialogContent>
          <div className="space-y-4">
            <BookingDialogHeader
              title="Create Booking"
              description="Share proposed session details before sending your request."
            />
            <CreateBookingForm
              conversationId={conversationId}
              customerId={currentUserId || ''}
              tutorId={otherUserId || ''}
              onBookingCreated={() => setShowBookingForm(false)}
              onCancel={() => setShowBookingForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(showModifyBookingForm)}
        onOpenChange={(open) => {
          if (!open) {
            setShowModifyBookingForm(null);
          }
        }}
      >
        <DialogContent>
          <div className="space-y-4">
            <BookingDialogHeader
              title="Modify Booking"
              description="Update the booking proposal and resubmit it to the chat."
            />
            {showModifyBookingForm && (
              <ModifyBookingForm
                booking={showModifyBookingForm}
                conversationId={conversationId}
                onBookingModified={() => setShowModifyBookingForm(null)}
                onCancel={() => setShowModifyBookingForm(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
