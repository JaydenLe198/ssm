import {
  getPostById,
  getCommentsByPostId,
  deletePost,
  deleteComment,
} from '@/app/forum/actions';
import { findOrCreateConversation } from '@/app/chat/actions';
import { CreateCommentForm } from '@/components/forum/CreateCommentForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const post = await getPostById(params.id);

  if (!post) {
    notFound();
  }

  const comments = await getCommentsByPostId(params.id);

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{post.content}</p>
          <p className="text-sm text-gray-500 mt-4">
            Created at: {new Date(post.createdAt).toLocaleDateString()}
          </p>
          {user?.id === post.userId && (
            <form
              action={async () => {
                'use server';
                await deletePost(post.id);
              }}
            >
              <Button variant="destructive" className="mt-4">
                Delete Post
              </Button>
            </form>
          )}
          {user && user.id !== post.userId && (
            <form
              action={async () => {
                'use server';
                const { conversationId, error } = await findOrCreateConversation(
                  post.userId,
                  user.id
                );
                if (error) {
                  console.error('Error connecting:', error);
                  // Optionally show a toast or error message to the user
                } else if (conversationId) {
                  redirect(`/chat/${conversationId}`);
                }
              }}
            >
              <Button className="mt-4">Connect</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Comments</h2>
        <CreateCommentForm postId={post.id} />
        <div className="space-y-4 mt-4">
          {comments.map(({ comment, author }) => (
            <Card key={comment.id}>
              <CardContent>
                <p>{comment.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Commented by: {author?.firstName} {author?.lastName} at{' '}
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
                {user?.id === comment.userId && (
                  <form
                    action={async () => {
                      'use server';
                      await deleteComment(comment.id, post.id);
                    }}
                  >
                    <Button variant="destructive" size="sm" className="mt-2">
                      Delete Comment
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
