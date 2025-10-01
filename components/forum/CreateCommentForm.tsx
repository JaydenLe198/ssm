'use client';

import { useFormState } from 'react-dom';
import { createComment } from '@/app/forum/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define a union type for the return values of createComment
type CreateCommentResult =
  | { success: false; error: string | { content?: string[]; postId?: string[] }; message?: undefined }
  | { success: true; message: string; error?: undefined };

const initialState: CreateCommentResult = {
  success: false,
  error: '', // Initialize error as an empty string to match the type
  message: undefined,
};

export function CreateCommentForm({ postId }: { postId: string }) {
  const [state, formAction] = useFormState(createComment, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="postId" value={postId} />
      <div>
        <Label htmlFor="content">Comment</Label>
        <Input id="content" name="content" required />
      </div>
      <Button type="submit">Add Comment</Button>
      {state?.message && <p className="text-green-500">{state.message}</p>}
      {state?.error && typeof state.error === 'string' && (
        <p className="text-red-500">{state.error}</p>
      )}
      {state?.error && typeof state.error === 'object' && state.error.content && (
        <p className="text-red-500">{state.error.content[0]}</p>
      )}
    </form>
  );
}
