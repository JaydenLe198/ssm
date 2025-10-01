import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPosts } from '@/app/forum/actions';
import { MessageSquare } from 'lucide-react'; // Assuming lucide-react is installed

// Infer the type of the posts from the server action
type PostsWithDetails = Awaited<ReturnType<typeof getPosts>>['posts'];

export function PostList({ posts }: { posts: PostsWithDetails }) {
  if (posts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
        <p className="text-center text-gray-500">
          No posts found.
          <br />
          Try adjusting your search or be the first to create a post!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map(({ post, author, commentCount }) => (
        <Link
          href={`/forum/${post.id}`}
          key={post.id}
          className="block transition-colors hover:bg-gray-50"
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Image
                  src={author?.avatarUrl || '/default-avatar.png'} // Assumes a default avatar exists in /public
                  alt={
                    author
                      ? `${author.firstName} ${author.lastName}`
                      : 'Default user avatar'
                  }
                  width={40}
                  height={40}
                  className="rounded-full"
                />
                <div>
                  <CardTitle>{post.title}</CardTitle>
                  <p className="text-sm text-gray-500">
                    Posted by {author?.firstName || 'Anonymous'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <Badge>{post.postType}</Badge>
                <p className="mt-2 text-sm text-gray-500">
                  Created at: {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <MessageSquare size={16} />
                <span>{commentCount}</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
