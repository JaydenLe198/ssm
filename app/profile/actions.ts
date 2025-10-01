'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update your profile.' };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const location = formData.get('location') as string;
  const bio = formData.get('bio') as string;
  const avatarFile = formData.get('avatar') as File;

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  let avatar_url: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(avatarFile.type)) {
        return { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WEBP image.' };
    }

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(`${user.id}/${avatarFile.name}`, avatarFile, {
        upsert: true,
      });
    if (error) {
      return { error: 'Failed to upload avatar.' };
    }
    avatar_url = data.path;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      location,
      bio,
      avatar_url,
    })
    .eq('id', user.id);

  if (error) {
    return { error: 'Failed to update profile.' };
  }

  revalidatePath('/profile');
  return { message: 'Profile updated successfully.' };
}
