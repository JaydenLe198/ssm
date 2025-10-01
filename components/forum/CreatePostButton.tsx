'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function CreatePostButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();

  const handleClick = () => {
    if (isLoggedIn) {
      router.push('/forum/create');
    } else {
      alert('You must be logged in to create a post.');
    }
  };

  return <Button onClick={handleClick}>Create Post</Button>;
}
