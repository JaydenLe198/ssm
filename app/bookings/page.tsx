import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';

interface RawBooking {
  id: string;
  title: string;
  status: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  hourly_rate: string;
  total_amount: string;
  conversation_id: string;
  created_at: string;
  updated_at: string;
  customer_id: string | null;
  tutor_id: string | null;
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'accepted':
      return 'default' as const;
    case 'pending':
      return 'secondary' as const;
    case 'declined':
    case 'cancelled':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

export default async function BookingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`customer_id.eq.${user.id},tutor_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading bookings:', error.message);
  }

  const bookings = (data ?? []).map((booking) => {
    const role = booking.customer_id === user.id ? 'customer' : 'tutor';

    return {
      id: booking.id,
      title: booking.title,
      status: booking.status,
      description: booking.description,
      scheduledStart: booking.scheduled_start,
      scheduledEnd: booking.scheduled_end,
      hourlyRate: booking.hourly_rate,
      totalAmount: booking.total_amount,
      conversationId: booking.conversation_id,
      createdAt: booking.created_at,
      role,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Review the most recent booking requests and jump back into their conversations.
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No bookings yet. Start a conversation to send your first booking request.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const scheduledWindow = `${new Date(booking.scheduledStart).toLocaleString()} – ${new Date(
              booking.scheduledEnd
            ).toLocaleString()}`;

            return (
              <Card key={booking.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{booking.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      You are the {booking.role}. Created {new Date(booking.createdAt).toLocaleString()}.
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {booking.description && (
                    <p className="text-sm text-muted-foreground">{booking.description}</p>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                    <p>{scheduledWindow}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span>Hourly rate: {booking.hourlyRate}</span>
                    <span>Total: {booking.totalAmount}</span>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/chat/${booking.conversationId}`}>View conversation</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
