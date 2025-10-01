import { getPosts } from '@/app/forum/actions';
import { PostList } from '@/components/forum/PostList';
import { CreatePostButton } from '@/components/forum/CreatePostButton';
import { postTypeEnum } from '@/utils/db/schema';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/forum/Pagination';
import { createClient } from '@/utils/supabase/server';

export default async function ForumPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    filter?: (typeof postTypeEnum.enumValues)[number];
    sort?: string;
    page?: string;
  };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentPage = Number(searchParams.page) || 1;
  const { posts, totalPages } = await getPosts({
    search: searchParams.search,
    filter: searchParams.filter,
    sort: searchParams.sort,
    page: currentPage,
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Forum</h1>
        <CreatePostButton isLoggedIn={!!user} />
      </div>

      <form className="mb-6 flex flex-col gap-4 md:flex-row">
        <Input
          name="search"
          placeholder="Search posts..."
          defaultValue={searchParams.search}
          className="flex-grow"
        />
        <Select name="filter" defaultValue={searchParams.filter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {postTypeEnum.enumValues.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="sort" defaultValue={searchParams.sort}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Newest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest</SelectItem>
            <SelectItem value="asc">Oldest</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

      <PostList posts={posts} />

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
