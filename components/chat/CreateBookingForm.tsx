'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createBookingRequest,
  type CreateBookingRequestFailure,
  type CreateBookingRequestResult,
} from '@/app/chat/actions';

const initialState: CreateBookingRequestFailure = {
  success: false,
  error: '',
  bookingId: undefined,
  checkout_url: undefined,
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
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBookingRequestWrapper = async (
    prevState: any,
    formData: FormData
  ) => {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    const rate = parseFloat(hourlyRate);

    const diffMs = end.getTime() - start.getTime();
    const sessionLengthMinutes = Math.round(diffMs / (1000 * 60));
    const totalAmount = ((sessionLengthMinutes / 60) * rate).toFixed(2);

    setIsSubmitting(true);

    const result = await createBookingRequest(
      conversationId,
      customerId,
      tutorId,
      formData.get('title') as string,
      formData.get('description') as string,
      start,
      end,
      sessionLengthMinutes,
      hourlyRate,
      totalAmount,
      formData.get('location') as string,
      formData.get('meetingLink') as string,
      formData.get('specialInstructions') as string
    );
    setIsSubmitting(false);
    return result;
  };

  const [state, formAction] = useFormState<CreateBookingRequestResult>(
    createBookingRequestWrapper,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      const { checkout_url } = state;
      setServerError(null);
      if (checkout_url) {
        window.location.assign(checkout_url);
      } else {
        setServerError('Unexpected error launching checkout. Please try again.');
      }
    } else if (state.error) {
      setServerError(state.error);
    }
  }, [state]);

  const disableForm = isSubmitting;

  const formActionLabel = useMemo(() => {
    if (isSubmitting) {
      return 'Submitting…';
    }
    return 'Send Booking Request';
  }, [isSubmitting]);

  return (
    <form action={formAction} className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Create Booking Request</h2>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required disabled={disableForm} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" disabled={disableForm} />
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
          disabled={disableForm}
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
          disabled={disableForm}
        />
      </div>
      <div>
        <Label htmlFor="hourlyRate">Hourly Rate</Label>
        <Input
          id="hourlyRate"
          name="hourlyRate"
          type="number"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          required
          disabled={disableForm}
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" type="text" disabled={disableForm} />
      </div>
      <div>
        <Label htmlFor="meetingLink">Meeting Link</Label>
        <Input id="meetingLink" name="meetingLink" type="text" disabled={disableForm} />
      </div>
      <div>
        <Label htmlFor="specialInstructions">Special Instructions</Label>
        <Textarea
          id="specialInstructions"
          name="specialInstructions"
          disabled={disableForm}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={disableForm}>
          {formActionLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
