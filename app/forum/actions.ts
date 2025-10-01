'use server';

import { db } from '@/utils/db/db';
import {
  commentsTable,
  postsTable,
  postTypeEnum,
  userProfilesTable,
} from '@/utils/db/schema';
import { createClient } from '@/utils/supabase/server';
import { and, asc, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  postType: z.enum(postTypeEnum.enumValues, {
    errorMap: () => ({ message: 'Invalid post type' }),
  }),
});

export async function createPost(prevState: any, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: '',
      success: false,
      error: 'You must be logged in to create a post.',
    };
  }

  const validatedFields = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    postType: formData.get('postType'),
  });

  if (!validatedFields.success) {
    return {
      message: '',
      success: false,
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await db.insert(postsTable).values({
      userId: user.id,
      title: validatedFields.data.title,
      content: validatedFields.data.content,
      postType: validatedFields.data.postType,
    });
    revalidatePath('/forum');
    return { message: 'Post created successfully.', success: true, error: undefined };
  } catch (error) {
    return {
      message: '',
      success: false,
      error: 'Failed to create post.',
    };
  }
}

const POSTS_PER_PAGE = 10;

export async function getPosts({
  search,
  filter,
  sort,
  page = 1,
}: {
  search?: string;
  filter?: (typeof postTypeEnum.enumValues)[number] | 'all';
  sort?: string;
  page?: number;
}) {
  const conditions = [];
  if (search) {
    conditions.push(ilike(postsTable.title, `%${search}%`));
  }
  if (filter && filter !== 'all') {
    conditions.push(eq(postsTable.postType, filter));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Query for the posts on the current page
  const pageQuery = db
    .select({
      post: postsTable,
      author: {
        firstName: userProfilesTable.first_name,
        lastName: userProfilesTable.last_name,
        avatarUrl: userProfilesTable.avatar_url,
      },
      commentCount: sql<number>`count(${commentsTable.id})`.mapWith(Number),
    })
    .from(postsTable)
    .leftJoin(userProfilesTable, eq(postsTable.userId, userProfilesTable.id))
    .leftJoin(commentsTable, eq(postsTable.id, commentsTable.postId))
    .where(whereClause)
    .groupBy(postsTable.id, userProfilesTable.id)
    .limit(POSTS_PER_PAGE)
    .offset((page - 1) * POSTS_PER_PAGE);

  if (sort === 'asc') {
    // @ts-ignore
    pageQuery.orderBy(asc(postsTable.createdAt));
  } else {
    // @ts-ignore
    pageQuery.orderBy(desc(postsTable.createdAt));
  }

  // Query to count the total number of posts matching the criteria
  const totalQuery = db
    .select({ total: count() })
    .from(postsTable)
    .where(whereClause);

  const [posts, totalResult] = await Promise.all([pageQuery, totalQuery]);
  const totalPosts = totalResult[0].total;

  const supabase = createClient();
  // Enhance posts with public avatar URLs
  const postsWithAvatars = posts.map((p) => {
    let publicAvatarUrl = null;
    if (p.author?.avatarUrl) {
      publicAvatarUrl = supabase.storage
        .from('avatars')
        .getPublicUrl(p.author.avatarUrl).data.publicUrl;
    }
    return {
      ...p,
      author: {
        ...p.author,
        avatarUrl: publicAvatarUrl,
      },
    };
  });

  return {
    posts: postsWithAvatars,
    totalPages: Math.ceil(totalPosts / POSTS_PER_PAGE),
  };
}

export async function getPostById(postId: string) {
  const post = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, postId));
  return post[0];
}

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  postId: z.string(),
});

export async function createComment(prevState: any, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be logged in to comment.' };
  }

  const validatedFields = commentSchema.safeParse({
    content: formData.get('content'),
    postId: formData.get('postId'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await db.insert(commentsTable).values({
      userId: user.id,
      postId: validatedFields.data.postId,
      content: validatedFields.data.content,
    });
    revalidatePath(`/forum/${validatedFields.data.postId}`);
    return { success: true, message: 'Comment added successfully.', error: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to add comment.' };
  }
}

export async function getCommentsByPostId(postId: string) {
  return await db
    .select({
      comment: commentsTable,
      author: {
        firstName: userProfilesTable.first_name,
        lastName: userProfilesTable.last_name,
        avatarUrl: userProfilesTable.avatar_url,
      },
    })
    .from(commentsTable)
    .leftJoin(
      userProfilesTable,
      eq(commentsTable.userId, userProfilesTable.id)
    )
    .where(eq(commentsTable.postId, postId))
    .orderBy(asc(commentsTable.createdAt));
}

export async function deletePost(postId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete a post.' };
  }

  try {
    const post = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, postId));
    if (post.length === 0 || post[0].userId !== user.id) {
      return { error: 'You are not authorized to delete this post.' };
    }

    await db.delete(postsTable).where(eq(postsTable.id, postId));
  } catch (error) {
    return { error: 'Failed to delete post.' };
  }
  revalidatePath('/forum');
  redirect('/forum');
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to delete a comment.' };
  }

  try {
    const comment = await db
      .select()
      .from(commentsTable)
      .where(eq(commentsTable.id, commentId));

    if (comment.length === 0 || comment[0].userId !== user.id) {
      return { error: 'You are not authorized to delete this comment.' };
    }

    await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
    revalidatePath(`/forum/${postId}`);
    return { message: 'Comment deleted successfully.' };
  } catch (error) {
    return { error: 'Failed to delete comment.' };
  }
}
