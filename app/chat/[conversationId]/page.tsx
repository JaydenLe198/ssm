'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import {
  getMessages,
  sendMessage,
  getUserProfileById,
  getBookingsByConversationId,
  updateBookingStatus,
  getInitialChatData, // Import the new server action
} from '@/app/chat/actions';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { conversationsTable, SelectBooking, SelectUserProfile } from '@/utils/db/schema'; // Import SelectUserProfile
import { db } from '@/utils/db/db';
import { eq, or, and } from 'drizzle-orm';
import { CreateBookingForm } from '@/components/chat/CreateBookingForm';
import { ModifyBookingForm } from '@/components/chat/ModifyBookingForm';

const initialState = {
  success: false,
  error: undefined,
};

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
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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
          setMessages((prevMessages) => [...prevMessages, payload.new]);
        }
      )
      .subscribe();

    return () => {
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

  return (
    <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-64px)]">
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <CardTitle>Chat with {otherUserName}</CardTitle>
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
          {showBookingForm ? (
            <CreateBookingForm
              conversationId={conversationId}
              customerId={currentUserId || ''}
              tutorId={otherUserId || ''}
              onBookingCreated={() => setShowBookingForm(false)}
              onCancel={() => setShowBookingForm(false)}
            />
          ) : showModifyBookingForm ? (
            <ModifyBookingForm
              booking={showModifyBookingForm}
              conversationId={conversationId}
              onBookingModified={() => setShowModifyBookingForm(null)}
              onCancel={() => setShowModifyBookingForm(null)}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="border-l-4 border-yellow-500">
                  <CardHeader>
                    <CardTitle>Booking Request: {booking.title}</CardTitle>
                    <p className="text-sm text-gray-500">Status: {booking.status}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p>Description: {booking.description}</p>
                    <p>
                      Scheduled:{' '}
                      {new Date(booking.scheduledStart).toLocaleString()} -{' '}
                      {new Date(booking.scheduledEnd).toLocaleString()}
                    </p>
                    <p>Hourly Rate: {booking.hourlyRate}</p>
                    <p>Total Amount: {booking.totalAmount}</p>
                    {booking.status === 'pending' &&
                      currentUserId !== booking.customerId && ( // Only tutor can accept/decline
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={async () =>
                              await updateBookingStatus(booking.id, 'accepted')
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={async () =>
                              await updateBookingStatus(booking.id, 'declined')
                            }
                          >
                            Declined
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowModifyBookingForm(booking)}
                          >
                            Modify
                          </Button>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
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
                >
                  Create Booking
                </Button>
              </form>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
