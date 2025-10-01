'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createBookingRequest } from '@/app/chat/actions';

type CreateBookingRequestResult =
  | { success: false; error: string; bookingId?: undefined } // When success is false, error must be a string
  | { success: true; bookingId: string; error?: undefined };

const initialState: CreateBookingRequestResult = {
  success: false,
  error: '', // Initialize error as an empty string to match the type
  bookingId: undefined,
};

interface CreateBookingFormProps {
  conversationId: string;
  customerId: string;
  tutorId: string;
  onBookingCreated: () => void;
  onCancel: () => void;
}

export function CreateBookingForm({
  conversationId,
  customerId,
  tutorId,
  onBookingCreated,
  onCancel,
}: CreateBookingFormProps) {
  // You might want to add more sophisticated date/time pickers here
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  const createBookingRequestWrapper = async (
    prevState: any,
    formData: FormData
  ) => {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    return createBookingRequest(
      conversationId,
      customerId,
      tutorId,
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
    createBookingRequestWrapper,
    initialState
  );

  if (state.success) {
    onBookingCreated();
  } else if (state.error) {
    alert(`Error: ${state.error}`);
  }

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Create Booking Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" />
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
              required
            />
          </div>
          <div>
            <Label htmlFor="hourlyRate">Hourly Rate</Label>
            <Input id="hourlyRate" name="hourlyRate" type="text" required />
          </div>
          <div>
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input id="totalAmount" name="totalAmount" type="text" required />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" type="text" />
          </div>
          <div>
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <Input id="meetingLink" name="meetingLink" type="text" />
          </div>
          <div>
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea id="specialInstructions" name="specialInstructions" />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Send Booking Request</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
