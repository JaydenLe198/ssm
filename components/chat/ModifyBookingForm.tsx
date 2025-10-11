'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { modifyBookingRequest } from '@/app/chat/actions';
import { SelectBooking } from '@/utils/db/schema';

type ModifyBookingRequestResult =
  | { success: false; error: string; bookingId?: undefined; checkout_url?: undefined }
  | { success: true; bookingId: string; checkout_url: string; error?: undefined };

const initialState: ModifyBookingRequestResult = {
  success: false,
  error: '',
  bookingId: undefined,
  checkout_url: undefined,
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
  const [hourlyRate, setHourlyRate] = useState(booking.hourlyRate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (booking) {
      setScheduledStart(new Date(booking.scheduledStart).toISOString().slice(0, 16));
      setScheduledEnd(new Date(booking.scheduledEnd).toISOString().slice(0, 16));
      setHourlyRate(booking.hourlyRate);
    }
  }, [booking]);

  const modifyBookingRequestWrapper = async (
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

    const result = await modifyBookingRequest(
      booking.id,
      conversationId,
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

  const [state, formAction] = useFormState(
    modifyBookingRequestWrapper,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      const { checkout_url } = state;
      if (checkout_url) {
        window.location.assign(checkout_url);
      } else {
        onBookingModified();
      }
    } else if (state.error) {
      alert(`Error: ${state.error}`);
    }
  }, [state, onBookingModified]);

  const disableForm = isSubmitting;

  const formActionLabel = useMemo(() => {
    if (isSubmitting) {
      return 'Submitting…';
    }
    return 'Send Modified Request';
  }, [isSubmitting]);

  return (
    <form action={formAction} className="space-y-4 p-4">
      <h2 className="text-xl font-bold mb-4">Modify Booking Request</h2>
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={booking.title} required disabled={disableForm} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={booking.description || ''}
          disabled={disableForm}
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
        <Input
          id="location"
          name="location"
          type="text"
          defaultValue={booking.location || ''}
          disabled={disableForm}
        />
      </div>
      <div>
        <Label htmlFor="meetingLink">Meeting Link</Label>
        <Input
          id="meetingLink"
          name="meetingLink"
          type="text"
          defaultValue={booking.meetingLink || ''}
          disabled={disableForm}
        />
      </div>
      <div>
        <Label htmlFor="specialInstructions">Special Instructions</Label>
        <Textarea
          id="specialInstructions"
          name="specialInstructions"
          defaultValue={booking.specialInstructions || ''}
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
