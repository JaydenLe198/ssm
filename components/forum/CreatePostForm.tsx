'use client';

import { useFormState } from 'react-dom';
import { createPost } from '@/app/forum/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { postTypeEnum } from '@/utils/db/schema';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const initialState = {
  message: '',
  success: false,
  error: undefined,
};

export function CreatePostForm() {
  const [state, formAction] = useFormState(createPost, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      alert(state.message);
      router.push('/forum');
    } else if (state.error) {
      // This can be improved to show errors next to fields
      alert(`Error: ${JSON.stringify(state.error)}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="content">Content</Label>
        <Input id="content" name="content" />
      </div>
      <div>
        <Label htmlFor="postType">Post Type</Label>
        <select
          id="postType"
          name="postType"
          className="w-full rounded-md border border-gray-300 p-2"
        >
          {postTypeEnum.enumValues.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Create Post</Button>
    </form>
  );
}
