'use client';

import { useFormState } from 'react-dom';
import { createComment } from '@/app/forum/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState = {
  message: '',
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
      <p>{state?.message}</p>
    </form>
  );
}
