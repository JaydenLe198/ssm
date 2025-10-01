import { CreatePostForm } from '@/components/forum/CreatePostForm';

export default function CreatePostPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create a New Post</h1>
      <CreatePostForm />
    </div>
  );
}
