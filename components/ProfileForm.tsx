'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Image from 'next/image';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { updateProfile } from '@/app/profile/actions';

export type ProfileFormData = {
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  bio: string;
  avatarUrl: string;
  roles: string[];
};

type ProfileFormProps = {
  initialData: ProfileFormData;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Update Profile'}
    </Button>
  );
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateProfile, { message: '', error: undefined });

  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                defaultValue={initialData.firstName}
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>
            <div>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                defaultValue={initialData.lastName}
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              defaultValue={initialData.phone}
              className="w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <div>
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              defaultValue={initialData.location}
              className="w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <div>
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={initialData.bio}
              className="w-full rounded-md border border-gray-300 p-2"
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="avatar">Avatar</label>
            <div className="flex items-center space-x-4">
              <Image
                src={initialData.avatarUrl || '/default-avatar.png'}
                alt="Avatar"
                width={80}
                height={80}
                className="rounded-full"
              />
              <input
                type="file"
                name="avatar"
                accept="image/jpeg, image/png, image/gif, image/webp"
              />
            </div>
          </div>
          <div>
            <p className="font-medium">Roles</p>
            <div className="flex flex-wrap gap-2">
              {initialData.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}


