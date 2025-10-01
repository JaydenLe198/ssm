'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { modifyBookingRequest } from '@/app/chat/actions';
import { SelectBooking } from '@/utils/db/schema';

type ModifyBookingRequestResult =
  | { success: false; error: string; bookingId?: undefined }
  | { success: true; bookingId: string; error?: undefined };

const initialState: ModifyBookingRequestResult = {
  success: false,
  error: '',
  bookingId: undefined,
};

interface ModifyBookingFormProps {
  booking: SelectBooking;
  conversationId: string;
  onBookingModified: () => void;
  onCancel: () => void;
}

export function ModifyBookingForm({
  booking,
  conversationId,
  onBookingModified,
  onCancel,
}: ModifyBookingFormProps) {
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  useEffect(() => {
    // Pre-populate form fields with existing booking data
    if (booking) {
      setScheduledStart(new Date(booking.scheduledStart).toISOString().slice(0, 16));
      setScheduledEnd(new Date(booking.scheduledEnd).toISOString().slice(0, 16));
    }
  }, [booking]);

  const modifyBookingRequestWrapper = async (
    prevState: any,
    formData: FormData
  ) => {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    return modifyBookingRequest(
      booking.id,
      conversationId,
      formData.get('title') as string,
      formData.get('description') as string,
      start,
      end,
      parseInt(formData.get('sessionLengthMinutes') as string),
      formData.get('hourlyRate') as string,
      formData.get('totalAmount') as string,
      formData.get('location') as string,
      formData.get('meetingLink') as string,
      formData.get('specialInstructions') as string
    );
  };

  const [state, formAction] = useFormState(
    modifyBookingRequestWrapper,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      onBookingModified();
    } else if (state.error) {
      alert(`Error: ${state.error}`);
    }
  }, [state, onBookingModified]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Modify Booking Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={booking.title} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={booking.description || ''}
            />
          </div>
          <div>
            <Label htmlFor="scheduledStart">Scheduled Start</Label>
            <Input
              id="scheduledStart"
              name="scheduledStart"
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="scheduledEnd">Scheduled End</Label>
            <Input
              id="scheduledEnd"
              name="scheduledEnd"
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="sessionLengthMinutes">Session Length (minutes)</Label>
            <Input
              id="sessionLengthMinutes"
              name="sessionLengthMinutes"
              type="number"
              defaultValue={booking.sessionLengthMinutes || ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input
              id="hourlyRate"
              name="hourlyRate"
              type="text"
              defaultValue={booking.hourlyRate}
              required
            />
          </div>
          <div>
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input
              id="totalAmount"
              name="totalAmount"
              type="text"
              defaultValue={booking.totalAmount}
              required
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              type="text"
              defaultValue={booking.location || ''}
            />
          </div>
          <div>
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input
              id="meetingLink"
              name="meetingLink"
              type="text"
              defaultValue={booking.meetingLink || ''}
            />
          </div>
          <div>
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              name="specialInstructions"
              defaultValue={booking.specialInstructions || ''}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Send Modified Request</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
